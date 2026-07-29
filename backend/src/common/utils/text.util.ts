/** Estandariza un nombre propio: primera letra de cada palabra en mayúscula, el resto en minúscula. */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-'))
    .join(' ');
}
