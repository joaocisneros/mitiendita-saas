"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type InventoryProduct,
  type StockMovementRow,
  type UnpaidReservation,
} from "@/lib/admin-api";
import Link from "next/link";
import { VariantStockModal, variantSummary } from "@/components/inventory/VariantStockModal";
import { PRODUCT_TYPES, typeHasOptions } from "@/lib/product-types";
import { SplitVariantsForm } from "@/components/inventory/SplitVariantsForm";
import { ActionHeader, LockedInfo, ReasonChips, soldUnits, type StockAction } from "@/components/inventory/ActionCards";

/** Las ventas y anulaciones ya traen su texto ("Venta al crédito CR-…"); no se repite el tipo. */
function movementText(type: string, reason: string | null) {
  const label = TYPE_LABEL[type] ?? type;
  if (!reason) return label;
  return /^(Venta|Anulación|Cancelación)/.test(reason) ? reason : `${label} · ${reason}`;
}


import { Overlay } from "@/components/OrderDetailModal";

const TYPE_LABEL: Record<string, string> = {
  entry: "Se agregaron unidades",
  sale: "Venta",
  adjustment: "Se corrigió la cantidad",
  return: "Producto devuelto",
  cancellation: "Pedido cancelado",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [holds, setHolds] = useState<UnpaidReservation[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [type, setType] = useState<StockAction>("entry");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // El tipo es el que se guardó al registrar el producto: no se vuelve a preguntar.
  // Los productos sin tipo guardado son "Sin tallas ni colores" (como en Productos).
  const kindInfo = PRODUCT_TYPES.find((t) => t.id === editing?.productType) ?? PRODUCT_TYPES[0];
  // Sin repartir todavía: "Llegó" pide marcar las tallas y cuántas hay de cada una.
  // Devolución y Corregir trabajan con la cantidad total hasta que se reparta.
  const splitting = typeHasOptions(kindInfo) && type === "entry";

  const load = useCallback(() => {
    adminApi.inventoryProducts().then(setProducts).catch(() => {});
    adminApi.inventoryReservations().then(setHolds).catch(() => {});
    adminApi.inventoryMovements(undefined, 1, { limit: 1 }).then((d) => setHistoryTotal(d.total)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  function open(p: InventoryProduct, action: StockAction = "entry") {
    setEditing(p);
    setType(action);
    setQuantity("");
    setReason("");
    setError("");
  }

  async function save() {
    if (!editing) return;
    setError("");
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 0) {
      setError("Escribe una cantidad válida, sin decimales.");
      return;
    }
    if (type !== "adjustment" && amount === 0) {
      setError("La cantidad debe ser mayor a cero.");
      return;
    }
    // Una devolución no puede ser mayor a lo que se vendió de este producto.
    if (type === "return" && amount > soldUnits(editing)) {
      setError(`Solo vendiste ${soldUnits(editing)} de este producto: no puedes devolver ${amount}.`);
      return;
    }
    setSaving(true);
    try {
      await adminApi.adjustStock({
        productId: editing.id,
        type,
        quantity: amount,
        reason: reason || undefined,
      });
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Operaciones</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Inventario</h1>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-50"
        >
          Ver historial ({historyTotal})
        </button>
      </div>

      {/* Lo separado: pedidos pagados que esperan confirmación de la tienda. */}
      {holds.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-amber-900">
                🧾 {holds.length === 1 ? "1 pedido pagado espera" : `${holds.length} pedidos pagados esperan`} tu confirmación
              </p>
              <p className="mt-0.5 text-xs font-medium text-amber-800">
                Su stock está separado. Al confirmarlo se descuenta; si rechazas el pago, vuelve a la venta.
              </p>
            </div>
            <Link href="/panel/pedidos" className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200">
              Revisar en Pedidos →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {holds.map((hold) => (
              <div key={hold.id} className="rounded-xl bg-white p-3 ring-1 ring-amber-200">
                <p className="text-sm font-bold text-slate-900">
                  {hold.customerName} <span className="font-mono text-xs font-semibold text-slate-400">· {hold.code}</span>
                </p>
                <p className="truncate text-xs text-slate-600">
                  {hold.items.map((item) => `${item.quantity}× ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stock actual */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4" title="Todo lo que se registró: lo que queda + lo vendido">Registrado</th>
                <th className="p-4" title="Unidades que hay en la tienda">Quedan</th>
                <th className="p-4">Vendido</th>
                <th className="p-4" title="Pedidos pagados que falta confirmar">Separado</th>
                <th className="p-4">Puedes vender</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((p) => (
                <tr key={p.id} className="text-slate-800">
                  <td className="p-4">
                    <span className="font-bold text-slate-950">{p.name}</span>
                    {!(p.variants?.length ?? 0) && typeHasOptions(PRODUCT_TYPES.find((t) => t.id === p.productType) ?? PRODUCT_TYPES[0]) && (
                      <span className="mt-0.5 block text-[11px] font-bold text-amber-700">
                        {PRODUCT_TYPES.find((t) => t.id === p.productType)?.label} · falta repartir por tallas o colores
                      </span>
                    )}
                    {(p.variants?.length ?? 0) > 0 && (
                      <span className="mt-0.5 block max-w-[320px] truncate text-[11px] font-semibold text-slate-500" title={variantSummary(p.variants ?? [], true)}>
                        {PRODUCT_TYPES.find((t) => t.id === p.productType)?.label ?? "Tallas y colores"} · {variantSummary(p.variants ?? [])}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500">{p.registered ?? p.stock}</td>
                  <td className="p-4 font-semibold">{p.stock}</td>
                  <td className="p-4">
                    <span className="font-bold text-slate-800">{(p.soldOnline ?? 0) + (p.soldCredit ?? 0)}</span>
                    {(p.soldOnline ?? 0) + (p.soldCredit ?? 0) > 0 && (
                      <span className="block text-[11px] font-semibold text-slate-500">
                        <span title="Vendido por la tienda virtual">🛒 {p.soldOnline ?? 0}</span> ·{" "}
                        <span title="Entregado al crédito">🤝 {p.soldCredit ?? 0}</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500">
                    {p.reserved}
                    {p.reserved > 0 && <span className="block text-[11px] font-bold text-amber-700">por confirmar</span>}
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${p.available <= 5 ? "text-amber-600" : "text-emerald-700"}`}>
                      {p.available}
                    </span>
                    {p.available <= 5 && <span className="ml-1 text-xs text-amber-600">⚠️</span>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => open(p, "entry")} title="Llegó mercadería: se suma" className="whitespace-nowrap rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
                        ➕ Llegó
                      </button>
                      <button onClick={() => open(p, "return")} title="Devolución de una clienta: se suma" className="whitespace-nowrap rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100">
                        ↩ Devolución
                      </button>
                      <button onClick={() => open(p, "adjustment")} title="Corregir conteo: se reemplaza" className="whitespace-nowrap rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
                        ✎ Corregir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Sin productos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* El historial se abre desde el botón superior para mantener limpia la vista. */}
      {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)} />}

      {/* Con tallas o colores: una casilla por opción. */}
      {editing && (editing.variants?.length ?? 0) > 0 && (
        <VariantStockModal
          product={editing}
          initialMode={type}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {/* Modal de ajuste (productos sin tallas ni colores) */}
      {editing && !(editing.variants?.length ?? 0) && (
        <Overlay onClose={() => setEditing(null)} size={splitting ? "large" : "medium"}>
          <div className="mb-4">
            <ActionHeader
              action={type}
              productName={editing.name}
              imageUrl={editing.imageUrl}
              detail={
                <>
                  Tienes <b className="text-slate-800">{editing.stock}</b>
                  {type === "return" && <> · vendidas <b className="text-slate-800">{soldUnits(editing)}</b></>} · puedes vender{" "}
                  <b className="text-slate-800">{editing.available}</b>
                </>
              }
            />
          </div>
          {/* Categoría y tipo guardados del producto: bloqueados (se cambian en Productos > Editar). */}
          {!splitting && (
            <div className="mb-4">
              <LockedInfo categoryName={editing.categoryName} typeLabel={kindInfo.label} />
            </div>
          )}
          {splitting ? (
            <SplitVariantsForm
              key={kindInfo.id}
              product={editing}
              typeId={kindInfo.id}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          ) : (
          <div className="space-y-3">
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              {type === "entry" && "Llegó mercadería de tu proveedor: lo que escribas se suma a lo que tienes."}
              {type === "return" && "Una clienta devolvió un producto que se puede vender otra vez: se suma."}
              {type === "adjustment" && "Contaste lo que hay en tu almacén: escribe cuántas hay de verdad y se reemplaza."}
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {type === "adjustment" ? "¿Cuántas unidades hay realmente?" : type === "return" ? "¿Cuántas unidades volvieron?" : "¿Cuántas unidades llegaron?"}
              </span>
              <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 px-3 text-lg font-black outline-none focus:border-violet-600" placeholder="Ej: 10" />
              {quantity !== "" && Number.isInteger(Number(quantity)) && Number(quantity) >= 0 && (
                <span className="mt-1 block text-xs font-bold text-violet-800">
                  Tienes {editing.stock} → quedarán {type === "adjustment" ? Number(quantity) : editing.stock + Number(quantity)}
                  {type === "adjustment" && Number(quantity) !== editing.stock && (
                    <span className={Number(quantity) < editing.stock ? "text-amber-700" : "text-emerald-700"}>
                      {" "}({Number(quantity) > editing.stock ? "+" : ""}{Number(quantity) - editing.stock}{Number(quantity) < editing.stock ? " faltan" : " sobran"})
                    </span>
                  )}
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Escribe una nota (opcional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder={type === "return" ? "Ej: devolución del cliente" : type === "adjustment" ? "Ej: conteo físico del almacén" : "Ej: compra al proveedor"} />
              <ReasonChips action={type} value={reason} onPick={setReason} />
            </label>
            {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg bg-slate-100 py-2 font-semibold text-slate-700">Cancelar</button>
              <button onClick={save} disabled={saving || quantity === ""} className="flex-1 rounded-lg bg-violet-600 py-2 font-semibold text-white disabled:opacity-60">
                {saving ? "Guardando..." : type === "adjustment" ? "Guardar conteo" : type === "return" ? "Devolver unidades" : "Agregar unidades"}
              </button>
            </div>
          </div>
          )}
        </Overlay>
      )}
    </div>
  );
}

const CHANNELS = [
  { id: "", label: "Todos" },
  { id: "tienda", label: "🛒 Tienda" },
  { id: "credito", label: "🤝 Crédito" },
  { id: "ajuste", label: "✍️ Ajustes" },
] as const;

const CHANNEL_BADGE: Record<string, { label: string; className: string }> = {
  tienda: { label: "🛒 Tienda", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  credito: { label: "🤝 Crédito", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  ajuste: { label: "✍️ Ajuste", className: "bg-slate-100 text-slate-700 ring-slate-200" },
};

/** Historial con paginación real, filtro por canal y el cliente de cada venta. */
function HistoryModal({ onClose }: { onClose: () => void }) {
  const PAGE_SIZE = 8;
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: StockMovementRow[]; total: number; pages: number } | null>(null);

  useEffect(() => {
    let alive = true;
    adminApi
      .inventoryMovements(undefined, page, { limit: PAGE_SIZE, channel: channel || undefined })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ items: [], total: 0, pages: 1 }));
    return () => {
      alive = false;
    };
  }, [page, channel]);

  const pages = Math.max(1, data?.pages ?? 1);
  return (
    <Overlay onClose={onClose} size="wide">
      <div className="mb-3 pr-10">
        <h2 className="text-xl font-black text-slate-950">Historial del inventario</h2>
        <p className="mt-1 text-sm text-slate-500">
          Todo lo que movió tu stock: lo que <b className="text-red-600">sale</b> (ventas) y lo que{" "}
          <b className="text-emerald-700">entra</b> (unidades nuevas, devoluciones, anulaciones).
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setChannel(c.id);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
              channel === c.id ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Alto fijo: la ventana no cambia de tamaño al cambiar de filtro o de página. */}
      <div className="h-[460px] overflow-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Canal</th>
              <th className="px-4 py-2.5">Producto</th>
              <th className="px-4 py-2.5">Cliente</th>
              <th className="px-4 py-2.5">Detalle</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5 text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!data ? (
              <tr><td colSpan={6} className="p-10 text-center text-slate-400">Cargando…</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-slate-500">No hay movimientos aquí.</td></tr>
            ) : (
              data.items.map((m) => {
                const badge = CHANNEL_BADGE[m.channel ?? "ajuste"] ?? CHANNEL_BADGE.ajuste;
                const what = m.channel === "ajuste" ? movementText(m.type, m.reason) : (m.reason ?? "").split(" · ")[0];
                return (
                  <tr key={m.id} className="h-[50px]">
                    <td className="px-4 py-2"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${badge.className}`}>{badge.label}</span></td>
                    <td className="max-w-[200px] truncate px-4 py-2 font-bold text-slate-900" title={m.productName}>{m.productName}</td>
                    <td className="max-w-[170px] truncate px-4 py-2 text-slate-700">{m.customerName ?? <span className="text-slate-400">—</span>}</td>
                    <td className="max-w-[220px] truncate px-4 py-2 text-xs text-slate-500" title={m.reason ?? undefined}>{what}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={`px-4 py-2 text-right font-black ${m.quantity >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {m.quantity >= 0 ? "+" : ""}
                      {m.quantity}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">Página {page} de {pages} · {data?.total ?? 0} movimientos</p>
        <div className="flex gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Anterior</button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-100 disabled:text-slate-400">Siguiente</button>
        </div>
      </div>
    </Overlay>
  );
}
