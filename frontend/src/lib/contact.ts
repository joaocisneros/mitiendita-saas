// Datos de contacto de MiTiendita (el dueño de la plataforma).
// Cambia el número aquí si algún día lo necesitas.
export const WHATSAPP_NUMBER = "51921676408";

/**
 * Número de soporte listo para wa.me: usa el configurado (o el de la landing)
 * y agrega el 51 si se guardó solo con los 9 dígitos del celular.
 */
export function supportNumber(configured?: string | null): string {
  const digits = (configured || WHATSAPP_NUMBER).replace(/\D/g, "");
  return /^9\d{8}$/.test(digits) ? `51${digits}` : digits;
}

/** Construye un enlace de WhatsApp con un mensaje listo. */
export function whatsappLink(
  message = "Hola, quiero información sobre MiTiendita 🛍️",
): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
