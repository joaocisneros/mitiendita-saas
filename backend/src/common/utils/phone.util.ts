/**
 * Normaliza un teléfono a solo dígitos para identificar al cliente.
 * Quita espacios, guiones, paréntesis y el "+".
 *   "+51 987 654 321" -> "51987654321"
 */
export function normalizePhone(raw: string): string {
  return (raw || '').replace(/\D+/g, '');
}
