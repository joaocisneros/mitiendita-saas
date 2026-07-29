import { createWorker } from 'tesseract.js';

// Palabras que aparecen en la propia app al confirmar el pago (Yape o Plin).
// No dependemos de una sola marca porque el negocio puede aceptar cualquiera de las dos.
const YAPE_KEYWORDS = ['yapeaste', 'yape'];
const PLIN_KEYWORDS = ['plineaste', 'plin y listo', 'plin'];

/** Resultado de leer el texto de una imagen de comprobante. */
export interface ProofOcrResult {
  looksLikePaymentProof: boolean;
  detectedMethod: 'yape' | 'plin' | null;
  operationNumber: string | null;
  rawText: string;
}

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
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

/**
 * Lee el texto de la imagen (OCR local, sin costo) y verifica que tenga pinta
 * de comprobante de Yape/Plin. No es infalible: es un primer filtro contra
 * fotos que evidentemente no son un comprobante, no contra una edición prolija.
 */
export async function analyzePaymentProof(buffer: Buffer): Promise<ProofOcrResult> {
  const worker = await createWorker('spa');
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    const normalized = normalize(text);
    const isYape = YAPE_KEYWORDS.some((k) => normalized.includes(k));
    const isPlin = PLIN_KEYWORDS.some((k) => normalized.includes(k));
    return {
      looksLikePaymentProof: isYape || isPlin,
      detectedMethod: isYape ? 'yape' : isPlin ? 'plin' : null,
      operationNumber: extractOperationNumber(text ?? ''),
      rawText: text ?? '',
    };
  } finally {
    await worker.terminate();
  }
}
