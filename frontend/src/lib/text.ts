// Mismo formato que aplica el backend al guardar (backend/src/common/utils/text.util.ts),
// para que el formulario muestre el resultado antes de guardar.

const MINOR_WORDS = new Set([
  "a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los",
  "o", "para", "por", "sin", "u", "y",
]);

/** Corrige solo lo escrito TODO EN MAYÚSCULAS o todo en minúsculas; respeta "iPhone 15". */
export function toCatalogName(value: string): string {
  const text = value.trim().replace(/\s+/g, " ");
  const letters = text.replace(/[^\p{L}]/gu, "");
  const allUpper = letters === letters.toUpperCase();
  const allLower = letters === letters.toLowerCase();
  if (letters.length < 2 || !(allUpper || allLower)) return text;
  return text
    .split(" ")
    .map((word, index) => {
      if (/\d/.test(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-");
    })
    .join(" ");
}

const ADDRESS_ABBR = /\b(av|jr|ca|calle|psje|pje|mz|lt|urb|asoc|prolong|nro|n°)\.(?=[^\s.,])/giu;

/** "jr.areanles 368" → "Jr. Areanles 368". */
export function toAddress(value: string): string {
  return toCatalogName(value.replace(ADDRESS_ABBR, "$1. "));
}

/** Notas: solo la primera letra en mayúscula. */
export function toSentence(value: string): string {
  const text = value.trim().replace(/\s+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
