"use client";

import { useState } from "react";
import { adminApi, type InventoryProduct } from "@/lib/admin-api";
import { PRODUCT_TYPES, colorChipsFor, usesTones } from "@/lib/product-types";
import { LockedInfo, SplitStatus } from "@/components/inventory/ActionCards";

const same = (a?: string | null, b?: string | null) =>
  (a ?? "").trim().toLocaleLowerCase() === (b ?? "").trim().toLocaleLowerCase();
const keyOf = (size: string | null, color: string | null) => `${size ?? ""}\u0000${color ?? ""}`.toLocaleLowerCase();

/**
 * Llegó mercadería a un producto con tipo de tallas/colores que aún no se repartió:
 * se marcan las opciones y cuántas hay AHORA de cada una (lo que había + lo que llegó).
 * Es el mismo producto: conserva ventas, historial, fotos y precio.
 * Izquierda: datos fijos, total y nota. Derecha: tallas, colores y cantidades.
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
  const tones = usesTones(typeId);

  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizeDraft, setSizeDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [totalTyped, setTotalTyped] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Con tallas: talla × color (si marcó colores). Sin tallas: una casilla por color.
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
  // El total es obligatorio y el reparto debe dar exacto para poder guardar.
  const wanted = totalTyped === "" ? null : Number(totalTyped);
  const pending =
    wanted === null
      ? "Escribe el total"
      : !combos.length
        ? `Marca ${usesSizes ? "las tallas" : tones ? "los tonos" : "los colores"}`
        : wanted > total
          ? `Reparte ${wanted - total} más`
          : wanted < total
            ? `Sobran ${total - wanted}`
            : null;

  function toggle(kind: "size" | "color", value: string) {
    const setList = kind === "size" ? setSizes : setColors;
    setList((prev) => (prev.some((item) => same(item, value)) ? prev.filter((item) => !same(item, value)) : [...prev, value]));
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
    if (!usesSizes && !colors.length) return setError(`Marca al menos un ${tones ? "tono" : "color"}.`);
    if (totalTyped !== "" && Number(totalTyped) !== total)
      return setError(`Reparte exacto: escribiste ${totalTyped} en total y repartiste ${total}.`);
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

  /** Botones para marcar con un toque (como al crear el producto) y uno para escribir otra opción. */
  const chips = (kind: "size" | "color") => {
    const list = kind === "size" ? sizes : colors;
    const suggested = kind === "size" ? [...(type?.sizes ?? [])] : type ? colorChipsFor(type) : [];
    const options = [...suggested, ...list.filter((item) => !suggested.some((s) => same(s, item)))];
    const draft = kind === "size" ? sizeDraft : colorDraft;
    const setDraft = kind === "size" ? setSizeDraft : setColorDraft;
    const noun = kind === "size" ? "las tallas" : tones ? "los tonos" : "los colores";
    return (
      <div>
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Marca {noun} que tienes{kind === "color" && usesSizes ? " (opcional)" : ""}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {options.map((option) => {
            const on = list.some((item) => same(item, option));
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(kind, option)}
                className={`min-w-10 rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition ${
                  on ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-300 hover:ring-violet-400"
                }`}
              >
                {option}
              </button>
            );
          })}
          <span className="flex gap-1">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption(kind, draft);
                }
              }}
              placeholder={kind === "size" ? "Otra talla" : tones ? "Otro tono" : "Otro color"}
              className="h-8 w-24 rounded-lg border border-slate-300 px-2 text-xs outline-none focus:border-violet-600"
            />
            <button type="button" onClick={() => addOption(kind, draft)} className="rounded-lg px-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">
              + Agregar
            </button>
          </span>
        </div>
      </div>
    );
  };

  return (
    // Mismo diseño que "Llegó" de un producto con tallas: dos columnas y el resumen abajo.
    <div className="flex min-h-0 flex-1 flex-col">
    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[400px_1fr]">
      {/* Izquierda: datos fijos del producto, total, explicación y nota. */}
      <div className="flex flex-col gap-4">
        <LockedInfo categoryName={product.categoryName} typeLabel={type?.label ?? "Tallas y colores"} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            ¿Cuántas hay ahora en total? <span className="text-red-500">*</span>
          </span>
          <input
            value={totalTyped}
            onChange={(event) => setTotalTyped(event.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            placeholder={`Ej: ${before + 10}`}
            className={`h-11 w-full rounded-xl border px-3 text-lg font-black outline-none focus:border-violet-600 ${totalTyped === "" ? "border-amber-400" : "border-slate-300"}`}
          />
          <span className="mt-1 block min-h-6">
            {totalTyped !== "" && <SplitStatus total={Number(totalTyped)} assigned={total} />}
          </span>
        </label>
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          Este producto todavía no tiene sus {usesSizes ? "tallas" : tones ? "tonos" : "colores"}. Hoy tienes <b>{before}</b> en total:
          marca {usesSizes ? "las tallas" : tones ? "los tonos" : "los colores"} y escribe cuántas hay <b>ahora</b> de cada una, contando lo que llegó.
          Es el mismo producto: conserva sus ventas, historial, fotos y precio.
        </p>
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
      </div>

      {/* Derecha: tallas y colores para marcar, y cuántas hay de cada una. */}
      <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
        {usesSizes && chips("size")}
        {usesColors && chips("color")}
        {combos.length === 0 ? (
          <p className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-white p-4 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            Marca {usesSizes ? "las tallas" : tones ? "los tonos" : "los colores"} de arriba y aquí escribes cuántas hay de cada una.
          </p>
        ) : usesSizes && colors.length > 1 ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white ring-1 ring-slate-200">
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
                    <td className="px-3 py-2 font-black text-slate-900">{size}</td>
                    {colors.map((color) => (
                      <td key={color} className="px-2 py-2 text-center">{input(size, color)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Una sola lista (solo tallas o solo colores): cuadritos compactos, varios por fila.
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white ring-1 ring-slate-200">
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 xl:grid-cols-4">
            {combos.map(({ size, color }) => {
              const label = (size ?? color)!;
              return (
                <label key={`${size}-${color}`} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2 pl-3 ring-1 ring-slate-200">
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-900">{label}</span>
                    {size && color && <span className="block truncate text-[11px] font-semibold text-slate-500">{color}</span>}
                  </span>
                  {input(size, color)}
                </label>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </div>

      {/* Abajo, a lo ancho: resumen y botones (igual que en "Llegó"). */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center justify-between gap-3 rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-900">
          <span>Antes {before} sin talla → ahora</span>
          <span className="flex items-center gap-2">
            <b className="text-lg font-black">{total}</b>
            {total > 0 && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${diff > 0 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600"}`}>
                {diff > 0 ? `+${diff} llegaron` : diff < 0 ? `${diff} (corrección)` : "mismo total ✓"}
              </span>
            )}
          </span>
        </div>
        <div className="flex gap-2 sm:w-[420px]">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700 hover:bg-slate-200">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={saving || pending !== null} className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {saving ? "Guardando..." : pending ?? `Guardar ${total} ${total === 1 ? "unidad" : "unidades"}`}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
