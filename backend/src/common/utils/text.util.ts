/** Estandariza un nombre propio: primera letra de cada palabra en mayúscula, el resto en minúscula. */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('-'),
    )
    .join(' ');
}

/** Conectores que van en minúscula dentro de un nombre (salvo al inicio). */
const MINOR_WORDS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'e',
  'el',
  'en',
  'la',
  'las',
  'los',
  'o',
  'para',
  'por',
  'sin',
  'u',
  'y',
]);

/**
 * Nombre de categoría o producto con formato profesional. Solo corrige lo
 * escrito TODO EN MAYÚSCULAS o todo en minúsculas ("PRODUCTO DE ASEOS" →
 * "Producto de Aseos"); si ya trae su propio formato ("iPhone 15") se respeta.
 * Las palabras con números ("200ML", "XL1") no se tocan.
 */
export function toCatalogName(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  const letters = text.replace(/[^\p{L}]/gu, '');
  const allUpper = letters === letters.toUpperCase();
  const allLower = letters === letters.toLowerCase();
  if (letters.length < 2 || !(allUpper || allLower)) return text;
  return text
    .split(' ')
    .map((word, index) => {
      if (/\d/.test(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
    })
    .join(' ');
}

/** Abreviaturas de dirección que deben ir seguidas de un espacio ("jr.Lima" → "jr. Lima"). */
const ADDRESS_ABBR =
  /\b(av|jr|ca|calle|psje|pje|mz|lt|urb|asoc|prolong|nro|n°)\.(?=[^\s.,])/giu;

/** Dirección con formato: abreviaturas separadas y mayúscula inicial ("jr.areanles 368" → "Jr. Areanles 368"). */
export function toAddress(value: string): string {
  return toCatalogName(value.replace(ADDRESS_ABBR, '$1. '));
}

/** Texto libre (notas): solo la primera letra en mayúscula, sin tocar el resto. */
export function toSentence(value: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
