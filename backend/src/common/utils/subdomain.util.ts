/**
 * Reglas para los subdominios de las tiendas (negocio.mitiendita.com).
 */

// Solo letras, números y guiones. No puede empezar ni terminar en guion.
const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

/**
 * Normaliza un texto a un slug de subdominio válido:
 * minúsculas, sin acentos, sin espacios ni caracteres raros.
 */
export function normalizeSubdomain(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9-]+/g, '-') // reemplaza inválidos por guion
    .replace(/-+/g, '-') // colapsa guiones repetidos
    .replace(/^-+|-+$/g, ''); // quita guiones de los extremos
}

/** Valida longitud y formato del slug ya normalizado. */
export function isValidSubdomain(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 63 && SUBDOMAIN_REGEX.test(slug);
}
