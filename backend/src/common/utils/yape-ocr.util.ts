import { createWorker, type Worker } from 'tesseract.js';

// Palabras que aparecen en la propia app al confirmar el pago (Yape o Plin).
// No dependemos de una sola marca porque el negocio puede aceptar cualquiera de las dos.
const YAPE_KEYWORDS = ['yapeaste', 'yape'];
const PLIN_KEYWORDS = ['plineaste', 'plin y listo', 'plin'];

/** Más lecturas en espera que esto: se omite el OCR para no saturar el servidor. */
const MAX_QUEUE = 3;
/** Una lectura que tarde más que esto se abandona (el dueño valida a mano). */
const OCR_TIMEOUT_MS = 20_000;

/** Resultado de leer el texto de una imagen de comprobante. */
export interface ProofOcrResult {
  looksLikePaymentProof: boolean;
  detectedMethod: 'yape' | 'plin' | null;
  operationNumber: string | null;
  rawText: string;
  /** true si no se pudo leer (servidor ocupado o lectura lenta). */
  skipped?: boolean;
}

function normalize(text: string): string {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Busca el N° de operación cerca de la palabra "operación" en el texto leído. */
function extractOperationNumber(text: string): string | null {
  const normalized = normalize(text);
  const idx = normalized.indexOf('operaci');
  if (idx === -1) return null;
  const window = text.slice(idx, idx + 60);
  const match = window.match(/[\d][\d.\-\s]{5,}/);
  if (!match) return null;
  const digits = match[0].replace(/[^\d]/g, '');
  return digits.length >= 6 ? digits : null;
}

// ── Un solo lector reutilizable y una lectura a la vez ──
// Crear un lector por subida (cargar el idioma, leer y destruirlo) era lo que
// más consumía. Ahora se crea una vez y las lecturas esperan en fila.
let workerPromise: Promise<Worker> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker('spa').catch((error: unknown) => {
    workerPromise = null;
    throw error;
  });
  return workerPromise;
}

/** Si el lector falló, se descarta para crear uno nuevo en la próxima lectura. */
async function resetWorker() {
  const current = workerPromise;
  workerPromise = null;
  await current?.then((worker) => worker.terminate()).catch(() => undefined);
}

function skippedResult(): ProofOcrResult {
  // No bloquea al cliente: el dueño valida el comprobante en su panel.
  return {
    looksLikePaymentProof: true,
    detectedMethod: null,
    operationNumber: null,
    rawText: '',
    skipped: true,
  };
}

async function recognize(buffer: Buffer): Promise<ProofOcrResult> {
  const worker = await getWorker();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), OCR_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([worker.recognize(buffer), timeout]);
    if (!result) {
      // La lectura quedó colgada: se reinicia el lector para la próxima.
      await resetWorker();
      return skippedResult();
    }
    const text = result.data.text ?? '';
    const normalized = normalize(text);
    const isYape = YAPE_KEYWORDS.some((k) => normalized.includes(k));
    const isPlin = PLIN_KEYWORDS.some((k) => normalized.includes(k));
    return {
      looksLikePaymentProof: isYape || isPlin,
      detectedMethod: isYape ? 'yape' : isPlin ? 'plin' : null,
      operationNumber: extractOperationNumber(text),
      rawText: text,
    };
  } catch {
    await resetWorker();
    return skippedResult();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lee el texto de la imagen (OCR local, sin costo) y verifica que tenga pinta
 * de comprobante de Yape/Plin. No es infalible: es un primer filtro contra
 * fotos que evidentemente no son un comprobante, no contra una edición prolija.
 */
export function analyzePaymentProof(buffer: Buffer): Promise<ProofOcrResult> {
  if (waiting >= MAX_QUEUE) return Promise.resolve(skippedResult());
  waiting += 1;
  const job = queue.then(() => recognize(buffer));
  queue = job.catch(() => undefined);
  return job.finally(() => {
    waiting -= 1;
  });
}
