/**
 * Taxonomía única de rubros de negocio.
 * Fuente de verdad para: el dropdown agrupado del registro y la
 * identidad visual (colores + terminología) de cada tienda según su rubro.
 */

export interface BusinessCategory {
  id: string;
  label: string;
  emoji: string;
  /** Paleta por defecto del rubro (el dueño puede sobreescribir su color). */
  theme: { primary: string; secondary: string };
  /** Terminología que se adapta al rubro en la tienda pública. */
  terms: { catalog: string; search: string; empty: string };
  subtypes: string[];
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: "comercio",
    label: "Comercio",
    emoji: "🛒",
    theme: { primary: "#4f46e5", secondary: "#6366f1" },
    terms: {
      catalog: "Productos",
      search: "Buscar productos...",
      empty: "Esta tienda aún no tiene productos publicados.",
    },
    subtypes: [
      "Farmacias",
      "Bodegas",
      "Minimarkets",
      "Ferreterías",
      "Tiendas de ropa",
      "Zapaterías",
      "Moda y accesorios",
      "Librerías",
      "Tiendas de mascotas",
      "Tecnología",
    ],
  },
  {
    id: "alimentos",
    label: "Alimentos",
    emoji: "🍕",
    theme: { primary: "#e11d48", secondary: "#f59e0b" },
    terms: {
      catalog: "Carta",
      search: "Buscar platos...",
      empty: "Esta carta aún no tiene platos publicados.",
    },
    subtypes: [
      "Restaurantes",
      "Pollerías",
      "Pizzerías",
      "Cafeterías",
      "Panaderías",
      "Pastelerías",
    ],
  },
  {
    id: "belleza",
    label: "Belleza",
    emoji: "💅",
    theme: { primary: "#db2777", secondary: "#ec4899" },
    terms: {
      catalog: "Servicios",
      search: "Buscar servicios...",
      empty: "Aún no hay servicios publicados.",
    },
    subtypes: ["SPA", "Barberías", "Salones de belleza", "Centros estéticos"],
  },
  {
    id: "salud",
    label: "Salud",
    emoji: "🏥",
    theme: { primary: "#0d9488", secondary: "#10b981" },
    terms: {
      catalog: "Servicios",
      search: "Buscar servicios...",
      empty: "Aún no hay servicios publicados.",
    },
    subtypes: [
      "Clínicas",
      "Consultorios",
      "Veterinarias",
      "Centros de terapia",
    ],
  },
  {
    id: "educacion",
    label: "Educación",
    emoji: "🎓",
    theme: { primary: "#2563eb", secondary: "#0ea5e9" },
    terms: {
      catalog: "Cursos",
      search: "Buscar cursos...",
      empty: "Aún no hay cursos publicados.",
    },
    subtypes: [
      "Academias",
      "Institutos",
      "Centros de capacitación",
      "Cursos online",
    ],
  },
  {
    id: "turismo",
    label: "Turismo",
    emoji: "🏨",
    theme: { primary: "#0891b2", secondary: "#f97316" },
    terms: {
      catalog: "Servicios",
      search: "Buscar...",
      empty: "Aún no hay publicaciones.",
    },
    subtypes: ["Hoteles", "Hostales", "Agencias de viaje"],
  },
  {
    id: "automotriz",
    label: "Automotriz",
    emoji: "🚗",
    theme: { primary: "#475569", secondary: "#f97316" },
    terms: {
      catalog: "Servicios",
      search: "Buscar...",
      empty: "Aún no hay publicaciones.",
    },
    subtypes: [
      "Talleres mecánicos",
      "Venta de repuestos",
      "Lavaderos de autos",
    ],
  },
  {
    id: "inmobiliario",
    label: "Inmobiliario",
    emoji: "🏠",
    theme: { primary: "#57534e", secondary: "#059669" },
    terms: {
      catalog: "Propiedades",
      search: "Buscar propiedades...",
      empty: "Aún no hay propiedades publicadas.",
    },
    subtypes: ["Inmobiliarias", "Alquileres", "Constructoras"],
  },
  {
    id: "servicios",
    label: "Servicios",
    emoji: "📦",
    theme: { primary: "#7c3aed", secondary: "#475569" },
    terms: {
      catalog: "Servicios",
      search: "Buscar servicios...",
      empty: "Aún no hay servicios publicados.",
    },
    subtypes: ["Delivery", "Mensajería", "Empresas de limpieza", "Seguridad"],
  },
  {
    id: "digital",
    label: "Digital",
    emoji: "🎬",
    theme: { primary: "#7e22ce", secondary: "#1e1b4b" },
    terms: {
      catalog: "Planes",
      search: "Buscar...",
      empty: "Aún no hay planes publicados.",
    },
    subtypes: [
      "Streaming",
      "Venta de cursos",
      "Membresías",
      "Contenido premium",
    ],
  },
  {
    id: "telecomunicaciones",
    label: "Telecomunicaciones",
    emoji: "📡",
    theme: { primary: "#dc2626", secondary: "#2563eb" },
    terms: {
      catalog: "Planes",
      search: "Buscar planes...",
      empty: "Aún no hay planes publicados.",
    },
    subtypes: [
      "Internet hogar",
      "Portabilidad",
      "Planes móviles",
      "Recargas y chips",
    ],
  },
];

export const DEFAULT_CATEGORY = BUSINESS_CATEGORIES[0];

/** Todos los subtipos, planos, para validaciones o listados simples. */
export const ALL_SUBTYPES = BUSINESS_CATEGORIES.flatMap((c) => c.subtypes);

/** Plantilla de tienda que usa cada rubro. */
export type StoreArchetype = "catalogo" | "carta" | "servicios" | "digital";

const ARCHETYPE_BY_CATEGORY: Record<string, StoreArchetype> = {
  comercio: "catalogo",
  alimentos: "carta",
  belleza: "servicios",
  salud: "servicios",
  educacion: "digital", // academias/cursos: mensualidad con vencimiento (suscripción)
  turismo: "servicios",
  automotriz: "servicios",
  inmobiliario: "servicios",
  servicios: "servicios",
  digital: "digital",
  telecomunicaciones: "digital", // catálogo de planes; el cliente contacta para contratar
};

/** Texto del botón de acción principal de cada rubro. */
const ACTION_BY_CATEGORY: Record<string, string> = {
  comercio: "Agregar",
  alimentos: "Agregar al pedido",
  belleza: "Reservar",
  salud: "Reservar cita",
  educacion: "Inscribirme",
  turismo: "Reservar",
  automotriz: "Agendar",
  inmobiliario: "Consultar",
  servicios: "Solicitar",
  digital: "Suscribirme",
  telecomunicaciones: "Quiero este plan",
};

export function archetypeOf(category: BusinessCategory): StoreArchetype {
  return ARCHETYPE_BY_CATEGORY[category.id] ?? "catalogo";
}

/** Contenido del encabezado (hero) propio de cada tipo de tienda. */
export interface StoreHero {
  /** Frase corta bajo el nombre de la tienda. */
  tagline: string;
  /** Llamada a la acción destacada en el hero. */
  cta: string;
}

const HERO_BY_ARCHETYPE: Record<StoreArchetype, StoreHero> = {
  catalogo: {
    tagline: "Tu tienda online — compra fácil y al toque",
    cta: "🛍️ Explora el catálogo y arma tu pedido",
  },
  carta: {
    tagline: "Pide tu comida favorita en minutos",
    cta: "🍴 Mira la carta y arma tu pedido",
  },
  servicios: {
    tagline: "Reserva tu atención en segundos",
    cta: "📅 Elige un servicio y reserva por WhatsApp",
  },
  digital: {
    tagline: "Planes y membresías al instante",
    cta: "⚡ Activa tu plan al toque por WhatsApp",
  },
};

// Algunos rubros comparten arquetipo pero merecen su propio mensaje.
const HERO_BY_CATEGORY: Partial<Record<string, StoreHero>> = {
  educacion: {
    tagline: "Inscríbete y empieza a aprender",
    cta: "🎓 Elige tu curso e inscríbete",
  },
  telecomunicaciones: {
    tagline: "Internet hogar y portabilidad al mejor precio",
    cta: "📡 Elige tu plan y contrata por WhatsApp",
  },
};

export function heroOf(archetype: StoreArchetype, categoryId?: string): StoreHero {
  if (categoryId && HERO_BY_CATEGORY[categoryId]) {
    return HERO_BY_CATEGORY[categoryId]!;
  }
  return HERO_BY_ARCHETYPE[archetype];
}

export function actionOf(category: BusinessCategory): string {
  return ACTION_BY_CATEGORY[category.id] ?? "Agregar";
}

const DEFAULT_PRIMARY = "#2563eb";

/**
 * Color principal de la tienda: el del rubro por defecto, o el que el dueño
 * personalizó (si difiere del azul por defecto). Úsalo en todo el flujo de compra.
 */
export function storeAccent(store: {
  primaryColor?: string | null;
  businessType?: string | null;
}): string {
  if (store.primaryColor && store.primaryColor !== DEFAULT_PRIMARY) {
    return store.primaryColor;
  }
  return resolveCategory(store.businessType).theme.primary;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/s\b/g, "") // insensible a plural
    .trim();
}

/**
 * Resuelve la categoría a partir del `businessType` guardado.
 * Tolerante a plural, acentos y a valores legados (ej. "Bodega", "Cosméticos").
 */
export function resolveCategory(businessType?: string | null): BusinessCategory {
  if (!businessType) return DEFAULT_CATEGORY;
  const bt = normalize(businessType);
  if (!bt) return DEFAULT_CATEGORY;
  for (const category of BUSINESS_CATEGORIES) {
    if (normalize(category.label) === bt || category.id === bt) return category;
    for (const sub of category.subtypes) {
      const s = normalize(sub);
      if (s === bt || s.includes(bt) || bt.includes(s)) return category;
    }
  }
  return DEFAULT_CATEGORY;
}
