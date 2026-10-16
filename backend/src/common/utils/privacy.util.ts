/**
 * Datos a medias para las vistas públicas (seguimiento del pedido, recibo):
 * quien tiene el enlace reconoce su pedido, pero un extraño no obtiene el
 * celular ni la dirección del cliente. El dueño ve todo completo en su panel.
 */

/** "Rosa Huamán Torres" → "Rosa H." */
export function maskName(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  if (!first) return '';
  return second ? `${first} ${second.charAt(0).toUpperCase()}.` : first;
}

/** "51912345678" o "912345678" → "912 *** 678" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local =
    digits.length === 11 && digits.startsWith('51') ? digits.slice(2) : digits;
  if (local.length < 6) return '***';
  return `${local.slice(0, 3)} *** ${local.slice(-3)}`;
}

/**
 * "Av. Giráldez 450, Huancayo" → "Av. Giráldez …". Si la dirección es de una
 * sola palabra no queda nada que mostrar sin revelarla: devuelve null.
 */
export function maskAddress(address: string | null): string | null {
  if (!address?.trim()) return null;
  const words = address.trim().split(/\s+/);
  const visible = words.slice(0, Math.min(2, words.length - 1));
  return visible.length ? `${visible.join(' ')} …` : null;
}
