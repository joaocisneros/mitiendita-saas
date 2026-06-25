// Datos de contacto de MiTiendita (el dueño de la plataforma).
// Cambia el número aquí si algún día lo necesitas.
export const WHATSAPP_NUMBER = "51921676408";

/** Construye un enlace de WhatsApp con un mensaje listo. */
export function whatsappLink(
  message = "Hola, quiero información sobre MiTiendita 🛍️",
): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
