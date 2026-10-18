/**
 * Tipo de producto: decide qué cajas aparecen (tallas, colores, guía).
 * No depende de la categoría, que algunas tiendas usan para la marca.
 * `sizes` son tallas sugeridas para marcar con un toque; null = no usa tallas.
 */
export const PRODUCT_TYPES = [
  { id: "simple", label: "Sin tallas ni colores", hint: "Collar, perfume, crema, accesorios, alimentos.", sizes: null, colors: false, guide: "" },
  { id: "ropa", label: "Ropa (polos, chompas)", hint: "Marca las tallas que tienes.", sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: true, guide: "Ej: S: pecho 88–92 cm\nM: pecho 93–98 cm\nL: pecho 99–104 cm" },
  { id: "pantalon", label: "Pantalones y jeans", hint: "Tallas por cintura.", sizes: ["26", "28", "30", "32", "34", "36", "38", "40"], colors: true, guide: "Ej: 30: cintura 76 cm\n32: cintura 81 cm" },
  { id: "lenceria", label: "Brasieres y lencería", hint: "Talla de contorno; agrega la copa si la manejas (ej. 34B).", sizes: ["32", "34", "36", "38", "40", "42"], colors: true, guide: "Ej: 34: contorno 74–78 cm" },
  { id: "ropa_grande", label: "Ropa de talla grande", hint: "Tallas extra grandes.", sizes: ["XL", "XXL", "3XL", "4XL", "5XL"], colors: true, guide: "Ej: 3XL: pecho 116–122 cm" },
  { id: "interior", label: "Ropa interior y medias", hint: "Truzas, bóxers, medias, pijamas.", sizes: ["S", "M", "L", "XL", "Única"], colors: true, guide: "Ej: M: cadera 94–98 cm" },
  { id: "uniformes", label: "Uniformes escolares", hint: "Tallas por edad o letra.", sizes: ["4", "6", "8", "10", "12", "14", "16", "S", "M", "L"], colors: true, guide: "Ej: 10: 9 a 10 años, 135–140 cm" },
  { id: "calzado_mujer", label: "Calzado de mujer", hint: "Tacos, botines, sandalias, ballerinas.", sizes: ["34", "35", "36", "37", "38", "39", "40"], colors: true, guide: "Ej: 36: 23 cm de plantilla\n37: 23.5 cm\n38: 24 cm" },
  { id: "calzado_hombre", label: "Calzado de hombre", hint: "Zapatos, zapatillas, botines.", sizes: ["38", "39", "40", "41", "42", "43", "44", "45"], colors: true, guide: "Ej: 40: 25.5 cm de plantilla\n41: 26 cm\n42: 26.5 cm" },
  { id: "calzado", label: "Calzado unisex", hint: "Zapatillas y sandalias para todos.", sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"], colors: true, guide: "Ej: 38: 24 cm de plantilla\n39: 24.5 cm\n40: 25 cm" },
  { id: "calzado_ninos", label: "Calzado de niños", hint: "Zapatillas y zapatos infantiles.", sizes: ["22", "24", "26", "28", "30", "32", "34"], colors: true, guide: "Ej: 26: 16.5 cm de plantilla" },
  { id: "ninos", label: "Ropa de niños", hint: "Tallas por edad.", sizes: ["2", "4", "6", "8", "10", "12", "14", "16"], colors: true, guide: "Ej: 4: 4 años, 100–105 cm de altura" },
  { id: "bebe", label: "Ropa de bebé", hint: "Tallas por meses.", sizes: ["0-3 m", "3-6 m", "6-12 m", "12-18 m", "18-24 m"], colors: true, guide: "" },
  { id: "anillos", label: "Anillos", hint: "Medida del anillo.", sizes: ["5", "6", "7", "8", "9", "10", "11", "12"], colors: true, guide: "Ej: 7: 17.3 mm de diámetro interior" },
  { id: "pulseras", label: "Pulseras y relojes", hint: "Largo de la pulsera o correa.", sizes: ["S", "M", "L", "Ajustable"], colors: true, guide: "Ej: S: 16 cm\nM: 18 cm\nL: 20 cm" },
  { id: "correas", label: "Correas y cinturones", hint: "Largo en centímetros.", sizes: ["80", "85", "90", "95", "100", "105", "110"], colors: true, guide: "Ej: 90: para cintura 76–81 cm" },
  { id: "gorras", label: "Gorras y sombreros", hint: "Medida de la cabeza.", sizes: ["S/M", "L/XL", "Única"], colors: true, guide: "Ej: S/M: 55–57 cm" },
  { id: "colores", label: "Solo colores", hint: "Bolsos, carteras, mochilas, fundas.", sizes: null, colors: true, guide: "" },
  { id: "otro", label: "Otras tallas", hint: "Escribe tú las tallas que manejas.", sizes: [], colors: true, guide: "Ej: Chico: 20 cm\nGrande: 30 cm" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  hint: string;
  sizes: readonly string[] | null;
  colors: boolean;
  guide: string;
}>;
export type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"];
