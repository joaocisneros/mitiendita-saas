"use client";

import { useState } from "react";
import { adminApi, type InventoryProduct, type InventoryVariant } from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";
import { PRODUCT_TYPES, colorChipsFor, usesTones } from "@/lib/product-types";
import { ActionHeader, LockedInfo, ReasonChips, SplitStatus, soldUnits, type StockAction } from "@/components/inventory/ActionCards";

type Mode = StockAction;

const same = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLocaleLowerCase() === (b ?? "").trim().toLocaleLowerCase();
const keyOf = (size: string | null, color: string | null) => `${size ?? ""}\u0000${color ?? ""}`.toLocaleLowerCase();

function unique(values: Array<string | null>) {
  const out: string[] = [];
  for (const value of values) {
    if (value && !out.some((item) => same(item, value))) out.push(value);
  }
  return out;
}

/** "S: 3 · M: 0 · L: 2" (por talla, o por color si no hay tallas). Con `full`, cada combinación. */
export function variantSummary(variants: InventoryVariant[], full = false) {
  const usesSizes = variants.some((v) => v.size);
  const usesColors = variants.some((v) => v.color);
  if (full && usesSizes && usesColors) {
    return variants.map((v) => `${v.size} ${v.color}: ${v.stock}`).join(" · ");
  }
  const groups = unique(variants.map((v) => (usesSizes ? v.size : v.color)));
  const text = groups
    .map((group) => {
      const total = variants
        .filter((v) => same(usesSizes ? v.size : v.color, group))
        .reduce((sum, v) => sum + v.stock, 0);
      return `${group}: ${total}`;
    })
    .join(" · ");
  const colors = unique(variants.map((v) => v.color)).length;
  return usesSizes && usesColors ? `${text} · ${colors} ${colors === 1 ? "color" : "colores"}` : text;
}

/**
 * Llegó / Devolución / Corregir de un producto con tallas o colores.
 * Izquierda: categoría y tipo (bloqueados), total y nota. Derecha: tallas y colores
 * del tipo para marcar con un toque, y cuántas de cada una.
 */
export function VariantStockModal({
  product,
  initialMode = "entry",
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  /** El botón que tocó en la tabla: Llegó, Devolución o Corregir. */
  initialMode?: StockAction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const variants = product.variants ?? [];
  const usesSizes = variants.some((v) => v.size);
  const usesColors = variants.some((v) => v.color);
  const type = PRODUCT_TYPES.find((t) => t.id === product.productType);
  const tones = usesTones(product.productType);

  // Cada botón de la tabla abre su propia ventana: la acción no cambia adentro.
  const mode: Mode = initialMode;
  // Llegó y Devolución suman; Corregir reemplaza lo que hay.
  const adds = mode !== "adjustment";
  // En una devolución no se agregan tallas ni colores nuevos.
  const canAddOptions = mode !== "return";
  const [sizes, setSizes] = useState(() => unique(variants.map((v) => v.size)));
  const [colors, setColors] = useState(() => unique(variants.map((v) => v.color)));
  const [values, setValues] = useState<Record<string, string>>(() =>
    // Al corregir, cada casilla parte de lo que hay; al sumar, en blanco.
    initialMode === "adjustment"
      ? Object.fromEntries(variants.map((v) => [keyOf(v.size, v.color), String(v.stock)]))
      : {},
  );
  const [total, setTotal] = useState("");
  const [sizeDraft, setSizeDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const current = (size: string | null, color: string | null) =>
    variants.find((v) => same(v.size, size) && same(v.color, color));
  const isNewSize = (size: string) => !variants.some((v) => same(v.size, size));
  const isNewColor = (color: string) => !variants.some((v) => same(v.color, color));

  // Todas las casillas: talla × color, solo tallas o solo colores.
  const combos: Array<{ size: string | null; color: string | null }> =
    usesSizes && usesColors
      ? sizes.flatMap((size) => colors.map((color) => ({ size, color })))
      : usesSizes
        ? sizes.map((size) => ({ size, color: null }))
        : colors.map((color) => ({ size: null, color }));

  const valueOf = (size: string | null, color: string | null) => values[keyOf(size, color)] ?? "";
  const setValue = (size: string | null, color: string | null, value: string) =>
    setValues((prev) => ({ ...prev, [keyOf(size, color)]: value.replace(/\D/g, "").slice(0, 4) }));

  const before = variants.reduce((sum, v) => sum + v.stock, 0);
  const entered = combos.reduce((sum, c) => sum + Number(valueOf(c.size, c.color) || 0), 0);
  const after = adds
    ? before + entered
    : combos.reduce((sum, c) => {
        const typed = valueOf(c.size, c.color);
        return sum + (typed === "" ? (current(c.size, c.color)?.stock ?? 0) : Number(typed));
      }, 0);
  // Total que escribió arriba (opcional): el reparto debe dar exacto.
  const totalNumber = total === "" ? null : Number(total);
  const assigned = adds ? entered : after;
  // Al sumar (Llegó / Devolución) el total es obligatorio y el reparto debe dar exacto
  // antes de guardar; al corregir, el total es opcional.
  // Una devolución no puede ser mayor a lo que se vendió de este producto.
  const sold = soldUnits(product);
  const pending = adds
    ? totalNumber === null || totalNumber <= 0
      ? "Escribe el total"
      : mode === "return" && totalNumber > sold
        ? `Solo vendiste ${sold}`
      : totalNumber > assigned
        ? `Reparte ${totalNumber - assigned} más`
        : totalNumber < assigned
          ? `Sobran ${assigned - totalNumber}`
          : null
    : totalNumber !== null && totalNumber !== assigned
      ? `Reparte exacto (${assigned} de ${totalNumber})`
      : null;
  const ready = pending === null;

  /** Marca o desmarca una talla/color del tipo. Las que ya tiene el producto no se quitan aquí. */
  function toggle(kind: "size" | "color", value: string) {
    const list = kind === "size" ? sizes : colors;
    const setList = kind === "size" ? setSizes : setColors;
    const isNew = kind === "size" ? isNewSize(value) : isNewColor(value);
    const on = list.some((item) => same(item, value));
    if (on && !isNew) return;
    setList(on ? list.filter((item) => !same(item, value)) : [...list, value]);
  }

  function addCustom(kind: "size" | "color", raw: string) {
    const text = raw.trim();
    if (!text) return;
    if (text.includes(",") || text.length > 30) return setError("Escribe una talla o color corto, sin comas.");
    const list = kind === "size" ? sizes : colors;
    if (list.some((item) => same(item, text))) return setError(`"${text}" ya está en la lista.`);
    setError("");
    if (kind === "size") {
      setSizes((prev) => [...prev, text]);
      setSizeDraft("");
    } else {
      setColors((prev) => [...prev, text]);
      setColorDraft("");
    }
  }

  async function save() {
    setError("");
    const rows = combos
      .filter((c) => {
        const typed = valueOf(c.size, c.color);
        const existing = current(c.size, c.color);
        if (!existing) return true; // opción nueva: se crea aunque quede en 0
        if (adds) return Number(typed || 0) > 0;
        return typed !== "" && Number(typed) !== existing.stock;
      })
      .map((c) => ({
        ...(c.size ? { size: c.size } : {}),
        ...(c.color ? { color: c.color } : {}),
        quantity: Number(valueOf(c.size, c.color) || 0),
      }));
    if (adds && entered <= 0)
      return setError(mode === "return" ? "Escribe cuántas volvieron en al menos una casilla." : "Escribe cuántas unidades llegaron en al menos una casilla.");
    if (totalNumber !== null && totalNumber !== assigned)
      return setError(`Reparte exacto: escribiste ${totalNumber} en total y repartiste ${assigned}.`);
    if (!rows.length) return setError("No cambiaste ninguna cantidad.");
    setSaving(true);
    try {
      await adminApi.adjustVariants({ productId: product.id, type: mode, reason: reason.trim() || undefined, rows });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const cell = (size: string | null, color: string | null) => {
    const existing = current(size, color);
    const fresh = !existing;
    // Al corregir, lo que cambió se marca en ámbar para verlo de un vistazo.
    const typed = valueOf(size, color);
    const changed = mode === "adjustment" && existing && typed !== "" && Number(typed) !== existing.stock;
    return (
      <div className="flex flex-col items-center gap-0.5">
        <input
          value={valueOf(size, color)}
          onChange={(event) => setValue(size, color, event.target.value)}
          inputMode="numeric"
          placeholder="0"
          aria-label={`${[size, color].filter(Boolean).join(" ")}: ${mode === "entry" ? "llegaron" : mode === "return" ? "volvieron" : "hay"}`}
          className={`h-9 w-16 rounded-lg border text-center text-sm font-black text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-300 focus:border-violet-600 ${
            fresh ? "border-emerald-300 bg-emerald-50" : changed ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"
          }`}
        />
        <span className={`text-[10px] font-semibold ${fresh ? "text-emerald-600" : changed ? "text-amber-700" : "text-slate-400"}`}>
          {fresh
            ? "nuevo"
            : adds
              ? `quedan ${existing.stock}`
              : changed
                ? `antes ${existing.stock} (${Number(typed) > existing.stock ? "+" : ""}${Number(typed) - existing.stock})`
                : `antes ${existing.stock}`}
        </span>
      </div>
    );
  };

  /** Botones para marcar: las del producto (✓ fijas), las sugeridas del tipo y las escritas a mano. */
  const chips = (kind: "size" | "color") => {
    const list = kind === "size" ? sizes : colors;
    const suggested = kind === "size" ? [...(type?.sizes ?? [])] : colorChipsFor(type ?? { id: "colores", group: "Otros" });
    const options = unique([...list, ...(canAddOptions ? suggested : [])]);
    const draft = kind === "size" ? sizeDraft : colorDraft;
    const setDraft = kind === "size" ? setSizeDraft : setColorDraft;
    const noun = kind === "size" ? "tallas" : tones ? "tonos" : "colores";
    return (
      <div>
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          {canAddOptions
            ? `Marca ${kind === "size" ? "las" : "los"} ${noun} que ${mode === "entry" ? "llegaron" : "tienes"}`
            : `${noun[0].toUpperCase()}${noun.slice(1)} del producto`}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {options.map((option) => {
            const on = list.some((item) => same(item, option));
            const fixed = on && (kind === "size" ? !isNewSize(option) : !isNewColor(option));
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(kind, option)}
                disabled={fixed || !canAddOptions}
                title={fixed ? "Ya está en el producto" : undefined}
                className={`min-w-10 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition ${
                  fixed
                    ? "cursor-default bg-violet-100 text-violet-800 ring-violet-200"
                    : on
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-slate-700 ring-slate-300 hover:ring-violet-400"
                }`}
              >
                {fixed && "✓ "}
                {option}
              </button>
            );
          })}
          {canAddOptions && (
            <span className="flex gap-1">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustom(kind, draft);
                  }
                }}
                placeholder={kind === "size" ? "Otra talla" : tones ? "Otro tono" : "Otro color"}
                className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-xs outline-none focus:border-violet-600"
              />
              <button type="button" onClick={() => addCustom(kind, draft)} className="rounded-lg px-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">
                + Agregar
              </button>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Overlay onClose={onClose} size="large">
      <ActionHeader
        action={mode}
        productName={product.name}
        imageUrl={product.imageUrl}
        detail={
          <>
            Tienes <b className="text-slate-800">{before}</b>
            {mode === "return" && (
              <>
                {" "}· Vendidas: <b className="text-slate-800">{soldUnits(product)}</b>
              </>
            )}{" "}
            · Puedes vender:{" "}
            <b className={product.available <= 0 ? "text-red-600" : "text-slate-800"}>
              {product.available}
              {product.available <= 0 && " · Agotado"}
            </b>
          </>
        }
      />

      {/* Tamaño fijo: la zona de tallas se desplaza por dentro, la ventana no crece. */}
      <div className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[400px_1fr]">
        {/* Izquierda: datos fijos del producto, total y nota. */}
        <div className="space-y-4">
          <LockedInfo categoryName={product.categoryName} typeLabel={type?.label ?? "Tallas y colores"} />

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              {mode === "entry" ? "¿Cuántas llegaron en total?" : mode === "return" ? "¿Cuántas volvieron en total?" : "¿Cuántas hay en total?"}{" "}
              {adds ? <span className="text-red-500">*</span> : <span className="font-normal text-slate-400">(opcional)</span>}
            </span>
            <input
              value={total}
              onChange={(event) => setTotal(event.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              placeholder="Ej: 10"
              className={`h-11 w-full rounded-xl border px-3 text-lg font-black outline-none focus:border-violet-600 ${adds && total === "" ? "border-amber-400" : "border-slate-300"}`}
            />
            <span className="mt-1 block min-h-6">
              {totalNumber !== null && <SplitStatus total={totalNumber} assigned={assigned} />}
            </span>
          </label>

          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            {mode === "entry"
              ? "Escribe cuántas llegaron de cada talla o color. Se suma a lo que queda; las que dejes vacías no cambian."
              : mode === "return"
                ? "Escribe cuántas devolvió la clienta de cada una (que se puedan vender otra vez). Se suma a lo que queda."
                : "Escribe cuántas hay de verdad en cada una después de contar. Se reemplaza lo que había."}
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Nota (opcional)</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={120}
              placeholder={mode === "entry" ? "Ej: compra al proveedor" : mode === "return" ? "Ej: devolución de Ana, talla cambiada" : "Ej: conteo del almacén"}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-violet-600"
            />
            <ReasonChips action={mode} value={reason} onPick={setReason} />
          </label>
        </div>

        {/* Derecha: tallas y colores del tipo, y cuántas de cada una. */}
        <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
          {usesSizes && chips("size")}
          {usesColors && chips("color")}
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white ring-1 ring-slate-200">
            {/* Tabla talla × color solo con 2 colores o más; si no, cuadritos compactos. */}
            {usesSizes && usesColors && colors.length > 1 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Talla</th>
                    {colors.map((color) => (
                      <th key={color} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide ${isNewColor(color) ? "text-emerald-700" : "text-slate-500"}`}>
                        {color}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((size) => (
                    <tr key={size} className="border-t border-slate-100">
                      <td className={`sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-black ${isNewSize(size) ? "text-emerald-700" : "text-slate-900"}`}>{size}</td>
                      {colors.map((color) => (
                        <td key={color} className="px-2 py-2">{cell(size, color)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Una sola lista (solo tallas o solo colores): cuadritos compactos, varios por fila.
              <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 xl:grid-cols-4">
                {combos.map(({ size, color }) => {
                  const label = (size ?? color)!;
                  const fresh = !current(size, color);
                  return (
                    <div key={`${size}-${color}`} className={`flex items-center justify-between gap-2 rounded-xl p-2 pl-3 ring-1 ${fresh ? "bg-emerald-50/60 ring-emerald-200" : "bg-white ring-slate-200"}`}>
                      <span className="min-w-0">
                        <span className={`block text-sm font-black ${fresh ? "text-emerald-700" : "text-slate-900"}`}>{label}</span>
                        {size && color && <span className="block truncate text-[11px] font-semibold text-slate-500">{color}</span>}
                      </span>
                      {cell(size, color)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center justify-between rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-900">
          <span>{mode === "entry" ? "Entran en total" : mode === "return" ? "Vuelven en total" : "Quedarán en total"}</span>
          <span className="text-lg font-black">
            {adds ? `+${entered}` : after}
            <span className="ml-2 text-xs font-semibold text-violet-700">{adds ? `quedarán ${after}` : `antes ${before}`}</span>
            {!adds && after !== before && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-black ${after < before ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                {after > before ? `+${after - before} sobran` : `${after - before} faltan`}
              </span>
            )}
          </span>
        </div>
        <div className="flex gap-2 sm:w-[420px]">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={saving || !ready} className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {saving
              ? "Guardando..."
              : pending
                ? pending
                : mode === "entry"
                ? `Agregar ${entered} ${entered === 1 ? "unidad" : "unidades"}`
                : mode === "return"
                  ? `Devolver ${entered} ${entered === 1 ? "unidad" : "unidades"}`
                  : "Guardar conteo"}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}
    </Overlay>
  );
}
