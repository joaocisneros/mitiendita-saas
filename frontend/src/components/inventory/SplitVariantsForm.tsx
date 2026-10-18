"use client";

import { useState } from "react";
import { adminApi, type InventoryProduct } from "@/lib/admin-api";
import { PRODUCT_TYPES, colorChipsFor, usesTones } from "@/lib/product-types";

const same = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLocaleLowerCase() === (b ?? "").trim().toLocaleLowerCase();
const keyOf = (size: string | null, color: string | null) => `${size ?? ""}\u0000${color ?? ""}`.toLocaleLowerCase();

/**
 * Completa el tipo de un producto que no tenía tallas ni colores: se marcan las
 * opciones y cuántas hay ahora de cada una (lo que había + lo que llegó).
 * Es el mismo producto: conserva ventas, historial, fotos y precio.
 */
export function SplitVariantsForm({
  product,
  typeId,
  onSaved,
  onCancel,
}: {
  product: InventoryProduct;
  typeId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const type = PRODUCT_TYPES.find((t) => t.id === typeId);
  const usesSizes = type?.sizes !== null && type?.sizes !== undefined;
  const usesColors = Boolean(type?.colors);

  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizeDraft, setSizeDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Con tallas: las filas son tallas (y los colores, columnas). Sin tallas: una fila por color.
  const combos: Array<{ size: string | null; color: string | null }> = usesSizes
    ? colors.length
      ? sizes.flatMap((size) => colors.map((color) => ({ size, color })))
      : sizes.map((size) => ({ size, color: null }))
    : colors.map((color) => ({ size: null, color }));

  const valueOf = (size: string | null, color: string | null) => values[keyOf(size, color)] ?? "";
  const setValue = (size: string | null, color: string | null, value: string) =>
    setValues((prev) => ({ ...prev, [keyOf(size, color)]: value.replace(/\D/g, "").slice(0, 4) }));
  const total = combos.reduce((sum, c) => sum + Number(valueOf(c.size, c.color) || 0), 0);
  const before = product.stock;
  const diff = total - before;

  function toggleSize(size: string) {
    setSizes((prev) => (prev.some((item) => same(item, size)) ? prev.filter((item) => !same(item, size)) : [...prev, size]));
  }

  function addOption(kind: "size" | "color", raw: string) {
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
    if (usesSizes && !sizes.length) return setError("Marca al menos una talla.");
    if (!usesSizes && !colors.length) return setError("Agrega al menos un color.");
    setSaving(true);
    try {
      await adminApi.splitVariants({
        productId: product.id,
        productType: typeId,
        reason: reason.trim() || undefined,
        rows: combos.map((c) => ({
          ...(c.size ? { size: c.size } : {}),
          ...(c.color ? { color: c.color } : {}),
          quantity: Number(valueOf(c.size, c.color) || 0),
        })),
      });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const input = (size: string | null, color: string | null) => (
    <input
      value={valueOf(size, color)}
      onChange={(event) => setValue(size, color, event.target.value)}
      inputMode="numeric"
      placeholder="0"
      aria-label={`${[size, color].filter(Boolean).join(" ")}: hay ahora`}
      className="h-9 w-16 rounded-lg border border-slate-300 bg-white text-center text-sm font-black text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-300 focus:border-violet-600"
    />
  );
  const removable = (kind: "size" | "color", value: string) => (
    <button
      type="button"
      onClick={() => (kind === "size" ? setSizes((p) => p.filter((i) => i !== value)) : setColors((p) => p.filter((i) => i !== value)))}
      className="ml-1 text-slate-400 hover:text-red-600"
      aria-label={`Quitar ${value}`}
    >
      ✕
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-violet-50 p-3 text-xs font-medium leading-5 text-violet-900">
        Es el <b>mismo producto</b>: conserva sus ventas, historial, fotos y precio. Hoy tienes <b>{before}</b> sin talla:
        escribe cuántas hay <b>ahora</b> de cada {usesSizes ? "talla" : "color"}, contando lo que llegó.
      </p>

      {usesSizes && (
        <div>
          <span className="mb-1 block text-sm font-semibold text-slate-700">Marca las tallas que tienes</span>
          <div className="flex flex-wrap gap-1.5">
            {(type?.sizes ?? []).map((size) => {
              const on = sizes.some((item) => same(item, size));
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`min-w-10 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition ${on ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-violet-50"}`}
                >
                  {size}
                </button>
              );
            })}
            <span className="flex gap-1">
              <input
                value={sizeDraft}
                onChange={(event) => setSizeDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addOption("size", sizeDraft))}
                placeholder="Otra talla"
                className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-xs outline-none focus:border-violet-600"
              />
              <button type="button" onClick={() => addOption("size", sizeDraft)} className="rounded-lg px-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">
                + Agregar
              </button>
            </span>
          </div>
        </div>
      )}

      {usesColors && (
        <div>
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            {usesSizes ? "Colores (opcional)" : usesTones(typeId) ? "Tonos" : "Colores"}
          </span>
          {type && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {colorChipsFor(type)
                .filter((option) => !colors.some((color) => same(color, option)))
                .map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColors((prev) => [...prev, option])}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-violet-50"
                  >
                    + {option}
                  </button>
                ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {colors.map((color) => (
              <span key={color} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white">
                {color}
                <button type="button" onClick={() => setColors((p) => p.filter((i) => i !== color))} className="ml-1 text-violet-200 hover:text-white" aria-label={`Quitar ${color}`}>
                  ✕
                </button>
              </span>
            ))}
            <input
              value={colorDraft}
              onChange={(event) => setColorDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addOption("color", colorDraft))}
              placeholder={usesTones(typeId) ? "Ej: Nude" : "Ej: Negro"}
              className="h-8 w-28 rounded-lg border border-slate-300 px-2 text-xs outline-none focus:border-violet-600"
            />
            <button type="button" onClick={() => addOption("color", colorDraft)} className="h-8 rounded-lg px-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">
              + Agregar
            </button>
          </div>
        </div>
      )}

      {combos.length > 0 && (
        <div className="max-h-[36vh] overflow-auto rounded-2xl ring-1 ring-slate-200">
          {usesSizes && colors.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Talla</th>
                  {colors.map((color) => (
                    <th key={color} className="px-2 py-2">{color}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-black text-slate-900">
                      {size}
                      {removable("size", size)}
                    </td>
                    {colors.map((color) => (
                      <td key={color} className="px-2 py-2 text-center">{input(size, color)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">{usesSizes ? "Talla" : usesTones(typeId) ? "Tono" : "Color"}</th>
                  <th className="px-3 py-2 text-right">Hay ahora</th>
                </tr>
              </thead>
              <tbody>
                {combos.map(({ size, color }) => {
                  const label = (size ?? color)!;
                  return (
                    <tr key={label} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-black text-slate-900">
                        {label}
                        {removable(size ? "size" : "color", label)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">{input(size, color)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Nota (opcional)</span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={120}
          placeholder="Ej: llegó mercadería del proveedor"
          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-violet-600"
        />
      </label>

      <div className="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-900">
        <span>
          Antes {before} sin talla → ahora <b className="text-lg font-black">{total}</b>
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${
            diff > 0 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600"
          }`}
        >
          {diff > 0 ? `+${diff} llegaron` : diff < 0 ? `${diff} (se registra como corrección)` : "mismo total ✓"}
        </span>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200">
          Cancelar
        </button>
        <button type="button" onClick={save} disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
          {saving ? "Guardando..." : `Guardar ${usesSizes ? "tallas" : "colores"}`}
        </button>
      </div>
    </div>
  );
}
