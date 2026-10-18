"use client";

import { useState } from "react";
import { adminApi, type InventoryProduct, type InventoryVariant } from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";
import { PRODUCT_TYPES } from "@/lib/product-types";

type Mode = "entry" | "adjustment";

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
 * "Cambiar cantidad" de un producto con tallas o colores: una casilla por opción.
 * Lo que se escribe se suma (o corrige el conteo); se pueden agregar tallas o colores nuevos.
 */
export function VariantStockModal({
  product,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const variants = product.variants ?? [];
  const usesSizes = variants.some((v) => v.size);
  const usesColors = variants.some((v) => v.color);
  const type = PRODUCT_TYPES.find((t) => t.id === product.productType);

  const [mode, setMode] = useState<Mode>("entry");
  const [sizes, setSizes] = useState(() => unique(variants.map((v) => v.size)));
  const [colors, setColors] = useState(() => unique(variants.map((v) => v.color)));
  const [values, setValues] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<"size" | "color" | null>(null);
  const [draft, setDraft] = useState("");
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

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    // Al corregir, cada casilla parte de lo que hay; al agregar, en blanco.
    setValues(
      next === "adjustment"
        ? Object.fromEntries(variants.map((v) => [keyOf(v.size, v.color), String(v.stock)]))
        : {},
    );
  }

  const before = variants.reduce((sum, v) => sum + v.stock, 0);
  const entered = combos.reduce((sum, c) => sum + Number(valueOf(c.size, c.color) || 0), 0);
  const after =
    mode === "entry"
      ? before + entered
      : combos.reduce((sum, c) => {
          const typed = valueOf(c.size, c.color);
          return sum + (typed === "" ? (current(c.size, c.color)?.stock ?? 0) : Number(typed));
        }, 0);
  const newOptions = sizes.filter(isNewSize).length + colors.filter(isNewColor).length;

  function addOption(raw: string) {
    const text = raw.trim();
    const list = adding === "size" ? sizes : colors;
    if (!text) return;
    if (text.includes(",") || text.length > 30) return setError("Escribe una talla o color corto, sin comas.");
    if (list.some((item) => same(item, text))) return setError(`"${text}" ya está en la lista.`);
    setError("");
    if (adding === "size") setSizes((prev) => [...prev, text]);
    else setColors((prev) => [...prev, text]);
    setDraft("");
    setAdding(null);
  }

  function removeOption(kind: "size" | "color", value: string) {
    if (kind === "size") setSizes((prev) => prev.filter((item) => item !== value));
    else setColors((prev) => prev.filter((item) => item !== value));
  }

  async function save() {
    setError("");
    const rows = combos
      .filter((c) => {
        const typed = valueOf(c.size, c.color);
        const existing = current(c.size, c.color);
        if (!existing) return true; // opción nueva: se crea aunque quede en 0
        if (mode === "entry") return Number(typed || 0) > 0;
        return typed !== "" && Number(typed) !== existing.stock;
      })
      .map((c) => ({
        ...(c.size ? { size: c.size } : {}),
        ...(c.color ? { color: c.color } : {}),
        quantity: Number(valueOf(c.size, c.color) || 0),
      }));
    if (mode === "entry" && entered <= 0) return setError("Escribe cuántas unidades llegaron en al menos una casilla.");
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

  const suggestions =
    adding === "size" ? (type?.sizes ?? []).filter((option) => !sizes.some((size) => same(size, option))) : [];

  const cell = (size: string | null, color: string | null) => {
    const existing = current(size, color);
    const fresh = !existing;
    return (
      <div className="flex flex-col items-center gap-0.5">
        <input
          value={valueOf(size, color)}
          onChange={(event) => setValue(size, color, event.target.value)}
          inputMode="numeric"
          placeholder="0"
          aria-label={`${[size, color].filter(Boolean).join(" ")}: ${mode === "entry" ? "llegaron" : "hay"}`}
          className={`h-9 w-16 rounded-lg border text-center text-sm font-black text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-300 focus:border-violet-600 ${
            fresh ? "border-emerald-300 bg-emerald-50" : "border-slate-300 bg-white"
          }`}
        />
        <span className={`text-[10px] font-semibold ${fresh ? "text-emerald-600" : "text-slate-400"}`}>
          {fresh ? "nuevo" : mode === "entry" ? `quedan ${existing.stock}` : `antes ${existing.stock}`}
        </span>
      </div>
    );
  };

  const newTag = <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-black uppercase text-emerald-700">nuevo</span>;
  const removable = (kind: "size" | "color", value: string) => (
    <button type="button" onClick={() => removeOption(kind, value)} className="ml-1 text-slate-400 hover:text-red-600" aria-label={`Quitar ${value}`}>
      ✕
    </button>
  );

  return (
    <Overlay onClose={onClose} size={usesSizes && usesColors ? "wide" : "medium"}>
      <div className="pr-10">
        <h2 className="text-xl font-black text-slate-950">Cambiar cantidad de {product.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {type?.label ?? "Tallas y colores"} · Puedes vender:{" "}
          <b className={product.available <= 0 ? "text-red-600" : "text-slate-800"}>
            {product.available}
            {product.available <= 0 && " · Agotado"}
          </b>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {([
          ["entry", "Agregar lo que llegó"],
          ["adjustment", "Corregir conteo"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            className={`rounded-lg py-2 text-sm font-bold transition ${mode === id ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">
        {mode === "entry"
          ? "Escribe cuántas llegaron de cada una. Se suma a lo que queda; las que dejes vacías no cambian."
          : "Escribe cuántas hay de verdad en cada una después de contar."}
      </p>

      <div className="mt-3 max-h-[46vh] overflow-auto rounded-2xl ring-1 ring-slate-200">
        {usesSizes && usesColors ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Talla</th>
                {colors.map((color) => (
                  <th key={color} className={`whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wide ${isNewColor(color) ? "text-emerald-700" : "text-slate-500"}`}>
                    {color}
                    {isNewColor(color) && (
                      <>
                        {newTag}
                        {removable("color", color)}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size} className="border-t border-slate-100">
                  <td className={`sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-black ${isNewSize(size) ? "text-emerald-700" : "text-slate-900"}`}>
                    {size}
                    {isNewSize(size) && (
                      <>
                        {newTag}
                        {removable("size", size)}
                      </>
                    )}
                  </td>
                  {colors.map((color) => (
                    <td key={color} className="px-2 py-2">{cell(size, color)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">{usesSizes ? "Talla" : "Color"}</th>
                <th className="px-3 py-2 text-right">{mode === "entry" ? "Llegaron" : "Hay"}</th>
              </tr>
            </thead>
            <tbody>
              {combos.map(({ size, color }) => {
                const label = (size ?? color)!;
                const fresh = usesSizes ? isNewSize(label) : isNewColor(label);
                return (
                  <tr key={label} className="border-t border-slate-100">
                    <td className={`px-3 py-2 font-black ${fresh ? "text-emerald-700" : "text-slate-900"}`}>
                      {label}
                      {fresh && (
                        <>
                          {newTag}
                          {removable(usesSizes ? "size" : "color", label)}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">{cell(size, color)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Tallas o colores que llegaron y el producto aún no tenía. */}
      {adding ? (
        <div className="mt-3 rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-3">
          <div className="flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption(draft);
                }
              }}
              placeholder={adding === "size" ? "Ej: 39 o XL" : "Ej: Rojo"}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-violet-600"
            />
            <button type="button" onClick={() => addOption(draft)} className="rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700">
              Agregar
            </button>
            <button type="button" onClick={() => { setAdding(null); setDraft(""); }} className="rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-white">
              Cancelar
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((option) => (
                <button key={option} type="button" onClick={() => addOption(option)} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">
                  + {option}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          {usesSizes && (
            <button type="button" onClick={() => setAdding("size")} className="flex-1 rounded-xl border-2 border-dashed border-violet-300 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">
              + Talla nueva
            </button>
          )}
          {usesColors && (
            <button type="button" onClick={() => setAdding("color")} className="flex-1 rounded-xl border-2 border-dashed border-violet-300 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">
              + Color nuevo
            </button>
          )}
        </div>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Nota (opcional)</span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={120}
          placeholder={mode === "entry" ? "Ej: compra al proveedor" : "Ej: conteo del almacén"}
          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-violet-600"
        />
      </label>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-900">
        <span>
          {mode === "entry" ? "Entran en total" : "Quedarán en total"}
          {newOptions > 0 && <span className="ml-2 text-xs font-semibold text-emerald-700">({newOptions} {newOptions === 1 ? "opción nueva" : "opciones nuevas"})</span>}
        </span>
        <span className="text-lg font-black">
          {mode === "entry" ? `+${entered}` : after}
          <span className="ml-2 text-xs font-semibold text-violet-700">{mode === "entry" ? `quedarán ${after}` : `antes ${before}`}</span>
        </span>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200">
          Cancelar
        </button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
          {saving ? "Guardando..." : mode === "entry" ? `Agregar ${entered} ${entered === 1 ? "unidad" : "unidades"}` : "Guardar conteo"}
        </button>
      </div>
    </Overlay>
  );
}
