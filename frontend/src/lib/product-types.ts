/**
 * Tipo de producto: decide qué cajas aparecen (tallas, colores, guía).
 * No depende de la categoría, que algunas tiendas usan para la marca.
 * `sizes` son tallas sugeridas para marcar con un toque; null = no usa tallas.
 * `colors` = muestra la caja de colores (o tonos). Sin tallas ni colores = una sola cantidad.
 * Los ids deben coincidir con backend/src/products/product-types.ts.
 */
export const PRODUCT_TYPES = [
  // Sin opciones: una sola cantidad.
  { id: "simple", group: "Sin tallas ni colores", label: "Sin tallas ni colores", hint: "Producto de una sola forma: solo pones la cantidad.", sizes: null, colors: false, guide: "" },
  { id: "alimentos", group: "Sin tallas ni colores", label: "Alimentos y bebidas", hint: "Abarrotes, bebidas, snacks. Solo pones la cantidad.", sizes: null, colors: false, guide: "" },
  { id: "utiles", group: "Sin tallas ni colores", label: "Útiles y librería", hint: "Cuadernos, lapiceros, útiles escolares.", sizes: null, colors: false, guide: "" },
  { id: "juguetes", group: "Sin tallas ni colores", label: "Juguetes", hint: "Juguetes y juegos. Solo pones la cantidad.", sizes: null, colors: false, guide: "" },

  // Ropa.
  { id: "ropa", group: "Ropa", label: "Ropa (polos, chompas)", hint: "Marca las tallas que tienes.", sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: true, guide: "Ej: S: pecho 88–92 cm\nM: pecho 93–98 cm\nL: pecho 99–104 cm" },
  { id: "pantalon", group: "Ropa", label: "Pantalones y jeans", hint: "Tallas por cintura.", sizes: ["26", "28", "30", "32", "34", "36", "38", "40"], colors: true, guide: "Ej: 30: cintura 76 cm\n32: cintura 81 cm" },
  { id: "vestidos", group: "Ropa", label: "Vestidos y faldas", hint: "Marca las tallas que tienes.", sizes: ["XS", "S", "M", "L", "XL"], colors: true, guide: "Ej: S: busto 84 cm, cintura 66 cm\nM: busto 88 cm, cintura 70 cm" },
  { id: "deportiva", group: "Ropa", label: "Ropa deportiva", hint: "Buzos, leggings, polos deportivos.", sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: true, guide: "Ej: M: cintura 70–76 cm" },
  { id: "bano", group: "Ropa", label: "Ropa de baño", hint: "Bikinis, ropa de baño, shorts.", sizes: ["XS", "S", "M", "L", "XL"], colors: true, guide: "Ej: S: busto 82–86 cm" },
  { id: "lenceria", group: "Ropa", label: "Brasieres y lencería", hint: "Talla de contorno; agrega la copa si la manejas (ej. 34B).", sizes: ["32", "34", "36", "38", "40", "42"], colors: true, guide: "Ej: 34: contorno 74–78 cm" },
  { id: "ropa_grande", group: "Ropa", label: "Ropa de talla grande", hint: "Tallas extra grandes.", sizes: ["XL", "XXL", "3XL", "4XL", "5XL"], colors: true, guide: "Ej: 3XL: pecho 116–122 cm" },
  { id: "interior", group: "Ropa", label: "Ropa interior y medias", hint: "Truzas, bóxers, medias, pijamas.", sizes: ["S", "M", "L", "XL", "Única"], colors: true, guide: "Ej: M: cadera 94–98 cm" },
  { id: "uniformes", group: "Ropa", label: "Uniformes escolares", hint: "Tallas por edad o letra.", sizes: ["4", "6", "8", "10", "12", "14", "16", "S", "M", "L"], colors: true, guide: "Ej: 10: 9 a 10 años, 135–140 cm" },
  { id: "ninos", group: "Ropa", label: "Ropa de niños", hint: "Tallas por edad.", sizes: ["2", "4", "6", "8", "10", "12", "14", "16"], colors: true, guide: "Ej: 4: 4 años, 100–105 cm de altura" },
  { id: "bebe", group: "Ropa", label: "Ropa de bebé", hint: "Tallas por meses.", sizes: ["0-3 m", "3-6 m", "6-12 m", "12-18 m", "18-24 m"], colors: true, guide: "" },

  // Calzado.
  { id: "calzado_mujer", group: "Calzado", label: "Calzado de mujer", hint: "Tacos, botines, sandalias, ballerinas.", sizes: ["34", "35", "36", "37", "38", "39", "40"], colors: true, guide: "Ej: 36: 23 cm de plantilla\n37: 23.5 cm\n38: 24 cm" },
  { id: "calzado_hombre", group: "Calzado", label: "Calzado de hombre", hint: "Zapatos, zapatillas, botines.", sizes: ["38", "39", "40", "41", "42", "43", "44", "45"], colors: true, guide: "Ej: 40: 25.5 cm de plantilla\n41: 26 cm\n42: 26.5 cm" },
  { id: "calzado", group: "Calzado", label: "Calzado unisex", hint: "Zapatillas y sandalias para todos.", sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"], colors: true, guide: "Ej: 38: 24 cm de plantilla\n39: 24.5 cm\n40: 25 cm" },
  { id: "calzado_ninos", group: "Calzado", label: "Calzado de niños", hint: "Zapatillas y zapatos infantiles.", sizes: ["22", "24", "26", "28", "30", "32", "34"], colors: true, guide: "Ej: 26: 16.5 cm de plantilla" },

  // Accesorios y joyas.
  { id: "relojes", group: "Accesorios y joyas", label: "Relojes", hint: "Sin tallas: escribe los colores de la correa o esfera.", sizes: null, colors: true, guide: "" },
  { id: "anillos", group: "Accesorios y joyas", label: "Anillos", hint: "Medida del anillo.", sizes: ["5", "6", "7", "8", "9", "10", "11", "12"], colors: true, guide: "Ej: 7: 17.3 mm de diámetro interior" },
  { id: "pulseras", group: "Accesorios y joyas", label: "Pulseras", hint: "Largo de la pulsera.", sizes: ["S", "M", "L", "Ajustable"], colors: true, guide: "Ej: S: 16 cm\nM: 18 cm\nL: 20 cm" },
  { id: "collares", group: "Accesorios y joyas", label: "Collares y cadenas", hint: "Largo de la cadena.", sizes: ["40 cm", "45 cm", "50 cm", "60 cm"], colors: true, guide: "Ej: 45 cm: queda a la altura de la clavícula" },
  { id: "aretes", group: "Accesorios y joyas", label: "Aretes", hint: "Sin tallas: escribe los colores (dorado, plateado…).", sizes: null, colors: true, guide: "" },
  { id: "lentes", group: "Accesorios y joyas", label: "Lentes y gafas", hint: "Sin tallas: escribe los colores de la montura.", sizes: null, colors: true, guide: "" },
  { id: "correas", group: "Accesorios y joyas", label: "Correas y cinturones", hint: "Largo en centímetros.", sizes: ["80", "85", "90", "95", "100", "105", "110"], colors: true, guide: "Ej: 90: para cintura 76–81 cm" },
  { id: "gorras", group: "Accesorios y joyas", label: "Gorras y sombreros", hint: "Medida de la cabeza.", sizes: ["S/M", "L/XL", "Única"], colors: true, guide: "Ej: S/M: 55–57 cm" },

  // Carteras y bolsos.
  { id: "carteras", group: "Carteras y bolsos", label: "Carteras y bolsos", hint: "Sin tallas: escribe los colores que tienes.", sizes: null, colors: true, guide: "" },
  { id: "billeteras", group: "Carteras y bolsos", label: "Billeteras y monederos", hint: "Sin tallas: escribe los colores que tienes.", sizes: null, colors: true, guide: "" },
  { id: "mochilas", group: "Carteras y bolsos", label: "Mochilas y loncheras", hint: "Sin tallas: escribe los colores que tienes.", sizes: null, colors: true, guide: "" },

  // Belleza.
  { id: "perfumes", group: "Belleza", label: "Perfumes y fragancias", hint: "Pon el tamaño en Material o presentación (ej. Frasco 100 ml).", sizes: null, colors: false, guide: "" },
  { id: "cuidado", group: "Belleza", label: "Cremas y cuidado personal", hint: "Pon el envase en Material o presentación (ej. Pote 200 g).", sizes: null, colors: false, guide: "" },
  { id: "maquillaje", group: "Belleza", label: "Maquillaje (tonos)", hint: "Escribe los tonos en Colores (ej. Rojo, Nude, Rosa).", sizes: null, colors: true, guide: "" },

  // Tecnología y hogar.
  { id: "celulares", group: "Tecnología y hogar", label: "Celulares y accesorios", hint: "Celulares, fundas, audífonos, cargadores. Escribe los colores.", sizes: null, colors: true, guide: "" },
  { id: "electro", group: "Tecnología y hogar", label: "Electrodomésticos", hint: "Escribe los colores si los tienes.", sizes: null, colors: true, guide: "" },
  { id: "hogar", group: "Tecnología y hogar", label: "Hogar y decoración", hint: "Menaje, decoración, textiles. Escribe los colores.", sizes: null, colors: true, guide: "" },

  // Otros.
  { id: "colores", group: "Otros", label: "Solo colores", hint: "Cualquier producto que solo cambia de color.", sizes: null, colors: true, guide: "" },
  { id: "otro", group: "Otros", label: "Otras tallas", hint: "Escribe tú las tallas que manejas.", sizes: [], colors: true, guide: "Ej: Chico: 20 cm\nGrande: 30 cm" },
] as const satisfies ReadonlyArray<{
  id: string;
  group: string;
  label: string;
  hint: string;
  sizes: readonly string[] | null;
  colors: boolean;
  guide: string;
}>;
export type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"];

/** Grupos en el orden en que aparecen en la lista. */
export const PRODUCT_TYPE_GROUPS = [...new Set(PRODUCT_TYPES.map((type) => type.group))];

/** ¿El tipo muestra tallas o colores? (si no, el producto lleva una sola cantidad). */
export const typeHasOptions = (type: { sizes: readonly string[] | null; colors: boolean }) =>
  type.sizes !== null || type.colors;
