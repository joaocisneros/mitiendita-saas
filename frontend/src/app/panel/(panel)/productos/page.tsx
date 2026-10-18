"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  type AdminCategory,
  type AdminProduct,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";
import { archetypeOf, resolveCategory } from "@/lib/business-categories";

const EMPTY = {
  name: "",
  price: "",
  stock: "",
  sku: "",
  categoryId: "",
  shortDescription: "",
  benefits: "",
  description: "",
  imageUrl: "",
  images: [] as string[],
  brand: "",
  material: "",
  sizeGuide: "",
  sizes: "",
  colors: "",
  variantStocks: [] as Array<{ size: string | null; color: string | null; stock: number; reserved: number }>,
  reservationPaymentMode: "optional" as "none" | "optional" | "required",
  reservationAdvanceType: "percent" as "fixed" | "percent",
  reservationAdvanceValue: "30",
  isFeatured: false,
  isActive: true,
};

function optionList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function rebuildVariants(
  sizesText: string,
  colorsText: string,
  current: Array<{ size: string | null; color: string | null; stock: number; reserved: number }>,
  /** Cantidad escrita antes de elegir tallas: si queda una sola opción, pasa a ella. */
  looseStock = 0,
) {
  const sizes = optionList(sizesText);
  const colors = optionList(colorsText);
  const combinations = sizes.length && colors.length
    ? sizes.flatMap((size) => colors.map((color) => ({ size, color })))
    : sizes.length
      ? sizes.map((size) => ({ size, color: null }))
      : colors.map((color) => ({ size: null, color }));
  // Con una sola opción, se conserva la cantidad que ya había: la escrita antes
  // de elegir tallas o la de la única opción anterior (ej. "37" → "37 · Blanco").
  const inherit =
    combinations.length !== 1 ? 0 : current.length === 0 ? looseStock : current.length === 1 ? current[0].stock : 0;
  return combinations.map(({ size, color }) => {
    const previous = current.find((row) => row.size === size && row.color === color);
    return { size, color, stock: previous?.stock ?? inherit, reserved: previous?.reserved ?? 0 };
  });
}

function splitDescription(description?: string | null) {
  const raw = description ?? "";
  const [short = "", rest = ""] = raw.split(/\n---\n/);
  if (raw.includes("\n---\n")) {
    return {
      shortDescription: short.trim(),
      benefits: rest.trim(),
      description: "",
    };
  }
  return {
    shortDescription: "",
    benefits: "",
    description: raw,
  };
}

function joinPlanDescription(shortDescription: string, benefits: string) {
  const cleanShort = shortDescription.trim();
  const cleanBenefits = benefits.trim();
  if (cleanShort && cleanBenefits) return `${cleanShort}\n---\n${cleanBenefits}`;
  return cleanShort || cleanBenefits;
}

/**
 * Tipo de producto: decide qué cajas aparecen (tallas, colores, guía).
 * No depende de la categoría, que algunas tiendas usan para la marca.
 * `sizes` son tallas sugeridas para marcar con un toque; null = no usa tallas.
 */
const PRODUCT_TYPES = [
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
type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"];

const splitSizes = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

/** Al editar, deduce el tipo según las tallas y colores guardados. */
function inferProductType(sizes: string, colors: string): ProductTypeId {
  const chosen = splitSizes(sizes).map((size) => size.toLowerCase());
  if (!chosen.length) return colors.trim() ? "colores" : "simple";
  const match = PRODUCT_TYPES.find(
    (type) => type.sizes?.length && chosen.every((size) => type.sizes!.some((option) => option.toLowerCase() === size)),
  );
  return match?.id ?? "otro";
}

function productDescriptionPlaceholder(category?: string): string {
  if (/perfume|fragancia/i.test(category ?? "")) return "Ej: Eau de parfum de 100 ml, aroma floral, ideal para uso diario. Indica marca, presentación y notas principales.";
  if (/joy|accesor|reloj/i.test(category ?? "")) return "Ej: Material, acabado, medidas, tipo de piedra y cuidados recomendados.";
  if (/ropa|zapat|calzado/i.test(category ?? "")) return "Ej: Material, tipo de corte, ajuste, ocasión de uso y recomendaciones de cuidado.";
  return "Describe material, presentación, características y beneficios para que el cliente entienda qué está comprando.";
}

export default function ProductosPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [isService, setIsService] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const noun = isDigital ? "plan" : isService ? "servicio" : "producto";
  const nounPlural = isDigital ? "Planes" : isService ? "Servicios" : "Productos";

  const descriptionPreview = useMemo(
    () => joinPlanDescription(form.shortDescription, form.benefits),
    [form.shortDescription, form.benefits],
  );

  const categoryName = (categoryId: string | null) =>
    categories.find((c) => c.id === categoryId)?.name;
  const selectedCategoryName = categoryName(form.categoryId);
  // Tipo de producto: muestra solo las cajas que corresponden (collar no tiene tallas).
  const [productType, setProductType] = useState<ProductTypeId>("simple");
  const typeInfo = PRODUCT_TYPES.find((type) => type.id === productType) ?? PRODUCT_TYPES[0];
  // Productos físicos: siempre 3 columnas (datos | tallas y colores | fotos).
  const isPhysical = !isDigital && !isService;
  const hasOptions = isPhysical && productType !== "simple";

  function chooseType(id: string) {
    const next = PRODUCT_TYPES.find((type) => type.id === id) ?? PRODUCT_TYPES[0];
    setProductType(next.id);
    // Las tallas no se llenan solas: el dueño marca las que tiene.
    const colors = next.colors ? form.colors : "";
    setForm({ ...form, sizes: "", colors, sizeGuide: "", variantStocks: rebuildVariants("", colors, form.variantStocks, form.variantStocks.length ? 0 : Number(form.stock) || 0) });
  }

  function load() {
    adminApi.products({ search: appliedSearch || undefined }).then((d) => setProducts(d.items));
    adminApi.categories().then(setCategories).catch(() => {});
    adminApi
      .settings()
      .then((settings) => {
        const archetype = archetypeOf(resolveCategory(settings.businessType));
        setIsDigital(archetype === "digital");
        setIsService(archetype === "servicios");
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch]);

  function openNew() {
    setForm({ ...EMPTY, stock: isDigital || isService ? "999" : "" });
    setProductType("simple");
    setEditing("new");
    setError("");
  }

  function openEdit(product: AdminProduct) {
    const parsed = splitDescription(product.description);
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      sku: product.sku ?? "",
      categoryId: product.categoryId ?? "",
      shortDescription: parsed.shortDescription,
      benefits: parsed.benefits,
      description: parsed.description,
      imageUrl: product.imageUrl ?? "",
      images: product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
      brand: product.brand ?? "",
      material: product.material ?? "",
      sizeGuide: product.sizeGuide ?? "",
      sizes: product.sizes ?? "",
      colors: product.colors ?? "",
      variantStocks: product.variantStocks ?? [],
      reservationPaymentMode: product.reservationPaymentMode ?? "optional",
      reservationAdvanceType: product.reservationAdvanceType ?? "percent",
      reservationAdvanceValue: String(product.reservationAdvanceValue ?? "30"),
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    const saved = PRODUCT_TYPES.find((type) => type.id === product.productType);
    setProductType(saved?.id ?? inferProductType(product.sizes ?? "", product.colors ?? ""));
    setEditing(product.id);
    setError("");
  }

  async function save() {
    setError("");
    if (!form.name || !form.price || (form.stock === "" && form.variantStocks.length === 0)) {
      setError(`Nombre, precio y ${isDigital || isService ? "stock interno" : "stock"} son obligatorios.`);
      return;
    }
    if (Number(form.price) <= 0) {
      setError("El precio debe ser mayor a cero.");
      return;
    }
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      setError("La cantidad debe ser un número entero igual o mayor a cero.");
      return;
    }
    if (form.variantStocks.length > 0) {
      const assigned = form.variantStocks.reduce((sum, row) => sum + row.stock, 0);
      const total = Number(form.stock);
      if (assigned !== total) {
        setError(
          assigned < total
            ? `Reparte exacto: tienes ${total} y solo repartiste ${assigned} (faltan ${total - assigned}).`
            : `Reparte exacto: tienes ${total} pero repartiste ${assigned} (sobran ${assigned - total}).`,
        );
        return;
      }
    }
    if (isService && form.reservationPaymentMode !== "none" && Number(form.reservationAdvanceValue) <= 0) {
      setError("El adelanto debe ser mayor a cero o cambia el modo a reservar sin pago.");
      return;
    }
    setSaving(true);
    try {
      const description = isDigital || isService ? descriptionPreview : form.description.trim();
      const body = {
        name: form.name,
        price: Number(form.price),
        stock: form.variantStocks.length ? form.variantStocks.reduce((sum, row) => sum + row.stock, 0) : Number(form.stock),
        sku: form.sku || undefined,
        categoryId: form.categoryId || null,
        ...(isDigital || isService ? {} : { productType }),
        description: description || undefined,
        images: form.images,
        brand: form.brand.trim() || undefined,
        material: form.material.trim() || undefined,
        sizeGuide: form.sizeGuide.trim() || undefined,
        ...(!isDigital && !isService
          ? {
              sizes: form.sizes.trim() || undefined,
              colors: form.colors.trim() || undefined,
              variantStocks: form.variantStocks.map(({ size, color, stock }) => ({ size: size ?? undefined, color: color ?? undefined, stock })),
            }
          : {}),
        ...(isService
          ? {
              reservationPaymentMode: form.reservationPaymentMode,
              reservationAdvanceType: form.reservationAdvanceType,
              reservationAdvanceValue: Number(form.reservationAdvanceValue || 0),
            }
          : {}),
        isFeatured: form.isFeatured,
        isActive: form.isActive,
      };
      if (editing === "new") {
        const created = await adminApi.createProduct(body);
        setProducts((current) => [created, ...current]);
      } else if (editing) {
        const updated = await adminApi.updateProduct(editing, body);
        setProducts((current) =>
          current.map((product) => (product.id === updated.id ? updated : product)),
        );
      }
      setEditing(null);
      // Sincroniza silenciosamente totales/filtros sin retrasar el cambio visible.
      void adminApi
        .products({ search: appliedSearch || undefined })
        .then((result) => setProducts(result.items));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function onImages(files: FileList | File[]) {
    const remaining = Math.max(0, 6 - form.images.length);
    const list = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining);
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) {
        const { url } = await adminApi.uploadImage(file, "products");
        setForm((current) => ({ ...current, images: [...current.images, url].slice(0, 4) }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setForm((current) => ({ ...current, images: current.images.filter((image) => image !== url) }));
  }

  function makeCover(url: string) {
    setForm((current) => ({ ...current, images: [url, ...current.images.filter((image) => image !== url)] }));
  }

  async function remove(product: AdminProduct) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    await adminApi.deleteProduct(product.id);
    setProducts((current) => current.filter((item) => item.id !== product.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">{nounPlural}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isDigital
              ? "Edita tus planes, beneficios, fotos y precios mensuales."
              : isService
                ? "Edita tus servicios, descripción, fotos y precios."
                : "Edita tus productos, fotos, precios y stock."}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          + Nuevo {noun}
        </button>
      </div>

      <div className="flex max-w-xl gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && setAppliedSearch(search.trim())}
          placeholder={`Buscar ${nounPlural.toLowerCase()} por nombre o SKU`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
        />
        <button
          onClick={() => setAppliedSearch(search.trim())}
          className="rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700"
        >
          Buscar
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-400">Aún no tienes {nounPlural.toLowerCase()}. Crea el primero.</p>
      ) : (
        <>
          {/* Tabla: pantallas medianas en adelante */}
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="p-4">{noun.charAt(0).toUpperCase() + noun.slice(1)}</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4">{isDigital || isService ? "Estado" : "Disponible"}</th>
                    <th className="p-4">Visibilidad</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {product.imageUrl ? (
                              <Image src={product.imageUrl} alt={product.name} fill sizes="44px" className="object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-lg text-gray-300">📦</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-950">{product.name}</p>
                            {product.sku && <p className="text-xs font-medium text-slate-500">SKU: {product.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{categoryName(product.categoryId) ?? "—"}</td>
                      <td className="p-4 font-bold text-slate-950">{formatPrice(product.price)}</td>
                      <td className="p-4">
                        {isDigital || isService ? (
                          <span className="font-semibold text-slate-700">Activo para venta</span>
                        ) : (
                          <span className={`font-bold ${product.stock - product.reserved <= 5 ? "text-amber-600" : "text-emerald-700"}`}>
                            {product.stock - product.reserved}
                          </span>
                        )}
                        {isService && (
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {product.reservationPaymentMode === "required"
                              ? "Adelanto obligatorio"
                              : product.reservationPaymentMode === "none"
                                ? "Sin adelanto"
                                : "Adelanto opcional"}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                        {product.isFeatured && (
                          <span className="ml-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Destacado</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 text-xs font-bold">
                          <button onClick={() => openEdit(product)} className="rounded-lg bg-violet-50 px-3 py-1.5 text-violet-700 hover:bg-violet-100">
                            Editar
                          </button>
                          <button onClick={() => remove(product)} className="rounded-lg bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tarjetas: solo en móvil */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {products.map((product) => (
              <div key={product.id} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl text-gray-300">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm font-bold text-violet-700">{formatPrice(product.price)}</p>
                  <p className="text-xs text-gray-400">
                    {isDigital || isService ? "Activo para venta" : `Stock: ${product.stock - product.reserved}`} {!product.isActive && "· inactivo"}
                  </p>
                  {isService && (
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {product.reservationPaymentMode === "required"
                        ? "Adelanto obligatorio"
                        : product.reservationPaymentMode === "none"
                          ? "Sin adelanto"
                          : "Adelanto opcional"}
                    </p>
                  )}
                  <div className="mt-1 flex gap-2 text-xs">
                    <button onClick={() => openEdit(product)} className="text-violet-600">
                      Editar
                    </button>
                    <button onClick={() => remove(product)} className="text-red-500">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <Overlay onClose={() => setEditing(null)} size="xl">
          <div className="flex min-h-full flex-col">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 pr-10">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {editing === "new" ? `Nuevo ${noun}` : `Editar ${noun}`}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Completa la información principal y guarda los cambios.
              </p>
            </div>
            <div className="flex gap-4">
              <Check label="Destacado" checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} />
              <Check label="Activo" checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} />
            </div>
          </div>

          <div className={`grid mb-5 flex-1 gap-5 ${isPhysical ? "lg:grid-cols-2 xl:grid-cols-[1fr_1fr_0.85fr]" : "lg:grid-cols-[1.4fr_1fr]"}`}>
            {/* Columna 1: datos básicos. */}
            <div className="space-y-3">
              <Input label={`Nombre del ${noun} *`} value={form.name} placeholder="Ej: Zapatillas Urbanas" onChange={(value) => setForm({ ...form, name: value })} />
              {!isDigital && !isService && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Marca (opcional)" value={form.brand} placeholder="Ej: Nike, Adidas o marca propia" onChange={(value) => setForm({ ...form, brand: value })} />
                  <Input label="Material o presentación" value={form.material} placeholder="Ej: Cuero sintético / Frasco de 100 ml" onChange={(value) => setForm({ ...form, material: value })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label={isDigital ? "Precio mensual *" : "Precio *"} type="number" min="0.01" step="0.01" placeholder="0.00" value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
                <Input
                  label={isDigital || isService ? "Stock interno *" : form.variantStocks.length ? "Cantidad total que tienes *" : "Cantidad disponible *"}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.stock}
                  onChange={(value) => setForm({ ...form, stock: value })}
                />
                {form.variantStocks.length > 0 && (
                  <p className="-mt-1 text-[11px] font-medium text-slate-500">Repártela exacta en &quot;Cantidad por opción&quot;.</p>
                )}
              </div>
              <div className={`grid gap-3 ${!isDigital && !isService ? "sm:grid-cols-2" : ""}`}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Categoría</span>
                  <select
                    value={form.categoryId}
                    onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                {!isDigital && !isService && (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Tipo de producto</span>
                    <select
                      value={productType}
                      onChange={(event) => chooseType(event.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500"
                    >
                      {PRODUCT_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs text-slate-500">{typeInfo.hint}</span>
                  </label>
                )}
              </div>

              <div>
                <Input label="SKU (opcional)" placeholder="Ej: ZAP-URB-NEG-42" value={form.sku} onChange={(value) => setForm({ ...form, sku: value.toUpperCase() })} />
                <p className="mt-1 text-xs text-slate-500">Código interno único para identificar el producto.</p>
              </div>

              {isDigital || isService ? (
                <>
                  <Textarea
                    label="Descripción corta"
                    value={form.shortDescription}
                    onChange={(value) => setForm({ ...form, shortDescription: value })}
                    rows={2}
                    placeholder={isDigital ? "Ej: Internet de fibra ideal para teletrabajo, streaming y juegos." : "Ej: Servicio profesional con atención personalizada."}
                  />
                  <Textarea
                    label={isDigital ? "Beneficios del plan" : "Características del servicio"}
                    value={form.benefits}
                    onChange={(value) => setForm({ ...form, benefits: value })}
                    rows={4}
                    placeholder={
                      isDigital
                        ? "200 Mbps de bajada\nInstalación gratis\nRouter WiFi incluido\nSoporte por WhatsApp"
                        : "Duración aproximada 60 min\nIncluye asesoría\nAtención previa reserva"
                    }
                  />
                </>
              ) : (
                <Textarea
                  label="Descripción"
                  value={form.description}
                  onChange={(value) => setForm({ ...form, description: value })}
                  rows={6}
                  placeholder={productDescriptionPlaceholder(selectedCategoryName)}
                />
              )}
            </div>

            {/* Columna 2: tallas, colores y cantidades. */}
            {isPhysical && (
            <div className="space-y-3">
              {!hasOptions && (
                <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center">
                  <span className="text-3xl" aria-hidden>🏷️</span>
                  <p className="mt-2 text-sm font-bold text-slate-800">Este producto no usa tallas ni colores</p>
                  <p className="mt-1 text-xs text-slate-500">¿Sí los tiene? Elige qué es y aparecen las opciones:</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {PRODUCT_TYPES.filter((type) => type.id !== "simple").map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => chooseType(type.id)}
                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
                      >
                        {type.label.replace(/ \(.*\)$/, "")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {hasOptions && (
                <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-3">
                  <div className="grid gap-3">
                    {typeInfo.sizes !== null && (
                      <div>
                        {typeInfo.sizes.length > 0 && (
                          <>
                            <span className="mb-1 block text-sm font-medium text-gray-700">Marca las tallas que tienes</span>
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {typeInfo.sizes.map((size) => {
                                const chosen = splitSizes(form.sizes);
                                const on = chosen.some((item) => item.toLowerCase() === size.toLowerCase());
                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => {
                                      const next = on
                                        ? chosen.filter((item) => item.toLowerCase() !== size.toLowerCase())
                                        : [...chosen, size];
                                      // Ordena según la lista sugerida; las que escribió a mano van al final.
                                      const order = (item: string) => {
                                        const index = typeInfo.sizes!.findIndex((option) => option.toLowerCase() === item.toLowerCase());
                                        return index === -1 ? 999 : index;
                                      };
                                      const sizes = next.sort((x, y) => order(x) - order(y)).join(", ");
                                      setForm({ ...form, sizes, variantStocks: rebuildVariants(sizes, form.colors, form.variantStocks, form.variantStocks.length ? 0 : Number(form.stock) || 0) });
                                    }}
                                    className={`min-w-10 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition ${
                                      on ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-200 hover:ring-violet-300"
                                    }`}
                                    aria-pressed={on}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                        <Input
                          label={typeInfo.sizes.length ? "Tallas elegidas (puedes agregar otras)" : "Tallas"}
                          placeholder={typeInfo.sizes.length ? "Toca las tallas de arriba" : "Ej: Chico, Mediano, Grande"}
                          value={form.sizes}
                          onChange={(value) => setForm({ ...form, sizes: value, variantStocks: rebuildVariants(value, form.colors, form.variantStocks, form.variantStocks.length ? 0 : Number(form.stock) || 0) })}
                        />
                      </div>
                    )}
                    <div>
                      <Input label="Colores (opcional)" placeholder="Negro, Blanco, Azul" value={form.colors} onChange={(value) => setForm({ ...form, colors: value, variantStocks: rebuildVariants(form.sizes, value, form.variantStocks, form.variantStocks.length ? 0 : Number(form.stock) || 0) })} />
                    </div>
                  </div>
                  {typeInfo.sizes !== null && (
                    <Textarea
                      label="Guía de tallas (opcional)"
                      value={form.sizeGuide}
                      onChange={(value) => setForm({ ...form, sizeGuide: value })}
                      rows={3}
                      placeholder={typeInfo.guide || "Ej: medidas de cada talla"}
                    />
                  )}
                </div>
              )}

              {!isDigital && !isService && form.variantStocks.length > 0 && (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">Cantidad por opción</p>
                      <p className="text-xs text-slate-500">Indica cuántas unidades tienes de cada talla y color.</p>

                    </div>
                    <SplitBadge total={Number(form.stock) || 0} assigned={form.variantStocks.reduce((sum, row) => sum + row.stock, 0)} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {form.variantStocks.map((row, index) => (
                      <label key={`${row.size ?? ""}-${row.color ?? ""}`} className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <span className="min-w-0 flex-1 break-words text-xs font-bold leading-tight text-slate-700" title={[row.size, row.color].filter(Boolean).join(" · ")}>
                          {[row.size, row.color].filter(Boolean).join(" · ")}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.stock}
                          onChange={(event) => {
                            const next = [...form.variantStocks];
                            next[index] = { ...row, stock: Math.max(0, Math.trunc(Number(event.target.value) || 0)) };
                            setForm({ ...form, variantStocks: next });
                          }}
                          className="h-9 w-16 rounded-lg border border-slate-200 px-2 text-right text-sm font-bold outline-none focus:border-violet-500"
                          aria-label={`Cantidad de ${[row.size, row.color].filter(Boolean).join(" ")}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>
            )}

            <aside className={`flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 ${isPhysical ? "lg:col-span-2 xl:col-span-1" : ""}`}>
              <div>
                <span className="mb-2 block text-sm font-bold text-gray-700">
                  Fotos {form.images.length > 0 && <span className="font-normal text-slate-400">({form.images.length}/6)</span>}
                </span>
                <div
                  className={`grid grid-cols-3 gap-3 xl:grid-cols-2 ${dragOver ? "rounded-2xl ring-2 ring-violet-400" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (form.images.length < 6) setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(false);
                    if (event.dataTransfer.files.length) onImages(event.dataTransfer.files);
                  }}
                >
                  {form.images.map((url, index) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                      <Image
                        src={url}
                        alt={form.name ? `${form.name} - foto ${index + 1}` : `Foto ${index + 1}`}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                      {index === 0 ? (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                          Portada
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(url)}
                          className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                        >
                          Hacer portada
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Quitar foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {form.images.length < 6 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-gray-200 text-center text-xs font-semibold text-violet-700 hover:border-violet-300 hover:bg-violet-50">
                      <span className="text-3xl leading-none">{uploading ? "…" : "+"}</span>
                      {uploading ? "Subiendo..." : "Agregar"}
                      <span className="font-normal text-slate-400">o suelta archivos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={(event) => {
                          if (event.target.files?.length) onImages(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  La primera foto es la portada. Hasta 6 fotos por {noun}.
                </p>
              </div>

              {(isDigital || isService) && (
                <div className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  El stock interno puede quedar en <b>999</b> para planes/servicios sin inventario físico.
                </div>
              )}

              {isService && (
                <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-sm font-black text-slate-800">Reserva y adelanto</p>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-500">Modo de reserva</span>
                    <select
                      value={form.reservationPaymentMode}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          reservationPaymentMode: event.target.value as "none" | "optional" | "required",
                        })
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500"
                    >
                      <option value="none">Reservar sin pago</option>
                      <option value="optional">Adelanto opcional</option>
                      <option value="required">Adelanto obligatorio</option>
                    </select>
                  </label>

                  {form.reservationPaymentMode !== "none" && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-slate-500">Tipo</span>
                        <select
                          value={form.reservationAdvanceType}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              reservationAdvanceType: event.target.value as "fixed" | "percent",
                            })
                          }
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500"
                        >
                          <option value="percent">Porcentaje</option>
                          <option value="fixed">Monto fijo</option>
                        </select>
                      </label>
                      <Input
                        label={form.reservationAdvanceType === "percent" ? "% adelanto" : "S/ adelanto"}
                        type="number"
                        value={form.reservationAdvanceValue}
                        onChange={(value) => setForm({ ...form, reservationAdvanceValue: value })}
                      />
                    </div>
                  )}

                  <p className="text-[11px] font-medium text-slate-500">
                    Opcional muestra dos botones al cliente. Obligatorio solo permite reservar subiendo comprobante.
                  </p>
                </div>
              )}

              {(isDigital || isService) && (
                <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                  La descripción corta se muestra como texto y cada línea de beneficios aparece con checks en la tienda.
                </div>
              )}

            </aside>
          </div>

          <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 mt-auto sm:-bottom-6 sm:-mb-6 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className={`text-sm ${error ? "font-semibold text-red-600" : "text-slate-500"}`}>
              {error || "Revisa los datos antes de guardar."}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:w-80">
              <button onClick={() => setEditing(null)} className="rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || uploading}
                className="rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, min, step, disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; min?: string; step?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

/** "Repartido X de Y": verde cuando cuadra exacto; rojo si falta o sobra. */
function SplitBadge({ total, assigned }: { total: number; assigned: number }) {
  const ok = assigned === total;
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
      Repartido {assigned} de {total}
      {ok ? " ✓" : assigned < total ? ` · faltan ${total - assigned}` : ` · sobran ${assigned - total}`}
    </span>
  );
}
