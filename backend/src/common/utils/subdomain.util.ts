/** Reglas para los subdominios de las tiendas (negocio.mitiendita.com). */

const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

/** Convierte un texto en un slug válido para usarlo como subdominio. */
export function normalizeSubdomain(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Valida longitud y formato del slug ya normalizado. */
export function isValidSubdomain(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 63 && SUBDOMAIN_REGEX.test(slug);
}
