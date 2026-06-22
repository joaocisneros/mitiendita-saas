/**
 * Convierte un texto en un slug limpio para URLs:
 * minúsculas, sin acentos, sin espacios ni símbolos.
 *   "Gaseosa Inca Kola 1.5L" -> "gaseosa-inca-kola-1-5l"
 */
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
