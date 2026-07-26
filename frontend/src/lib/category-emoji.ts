/**
 * Adivina un emoji para una categoría según su nombre (sin que el dueño lo
 * configure). Si no reconoce nada, usa un ícono genérico. Todo automático.
 */
const RULES: Array<[RegExp, string]> = [
  // Alimentos
  [/pizza/, "🍕"],
  [/hamburgues|burger/, "🍔"],
  [/bebida|gaseosa|jugo|refresco|trago/, "🥤"],
  [/postre|dulce|torta|pastel|helado/, "🍰"],
  [/pollo|broaster|parrilla|anticucho/, "🍗"],
  [/caf[eé]|cafeter/, "☕"],
  [/pan|panader|reposter/, "🥖"],
  [/desayuno|sandwich|sánguche/, "🥪"],
  [/ensalada|saludable|vegano|veget/, "🥗"],
  [/menú|menu|almuerzo|plato/, "🍽️"],
  // Ropa / moda
  [/ropa|prenda|polo|camis|vestido|moda/, "👕"],
  [/hombre|caballero|varón/, "👔"],
  [/mujer|dama|femenin/, "👗"],
  [/niñ|bebé|bebe|infantil|kids/, "🧒"],
  [/zapat|calzado|zapatill|sneaker/, "👟"],
  [/accesorio|cartera|bolso|mochila/, "👜"],
  [/reloj/, "⌚"],
  [/lente|gafa/, "🕶️"],
  // Joyería
  [/anillo/, "💍"],
  [/collar|cadena/, "📿"],
  [/joya|arete|pulsera|oro|plata/, "💎"],
  // Belleza
  [/maquilla|cosm[eé]tic/, "💄"],
  [/cabello|pelo|peluquer/, "💇"],
  [/perfume|fragancia/, "🌸"],
  [/uña|manicure/, "💅"],
  [/barba/, "🧔"],
  [/corte/, "✂️"],
  [/spa|masaje|facial|estétic/, "💆"],
  // Tecnología
  [/celular|smartphone|tel[eé]fono|móvil/, "📱"],
  [/laptop|computad|pc\b/, "💻"],
  [/audio|aud[ií]fono|parlante|sonido/, "🎧"],
  [/gaming|juego|consola/, "🎮"],
  [/smartwatch|smart watch/, "⌚"],
  [/tv|televis|pantalla/, "📺"],
  // Hogar
  [/mueble|sala|sof[aá]/, "🛋️"],
  [/cocina|utensilio/, "🍳"],
  [/decora/, "🖼️"],
  [/dormitor|colch[oó]n|cama/, "🛏️"],
  [/limpieza|hogar/, "🧹"],
  // Telecom
  [/internet|fibra|wifi/, "📡"],
  [/plan|portabil|m[oó]vil/, "📶"],
  [/recarga|chip|sim/, "📲"],
  // Otros rubros comunes
  [/mascota|perro|gato|veterinar/, "🐾"],
  [/farmac|salud|medicina|medicament/, "💊"],
  [/ferreter|herramient|construc/, "🔧"],
  [/libro|papeler|útil|utiles/, "📚"],
  [/juguet/, "🧸"],
  [/flor|planta|jardín/, "🌷"],
  [/curso|clase|academ|educ/, "🎓"],
  [/streaming|película|serie/, "🎬"],
  // Promos
  [/promo|oferta|descuento|combo/, "🔥"],
  [/delivery|env[ií]o/, "🛵"],
];

export function categoryEmoji(name: string): string {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  for (const [rx, emoji] of RULES) {
    if (rx.test(n)) return emoji;
  }
  return "🏷️";
}
