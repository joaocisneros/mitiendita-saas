"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type InventoryProduct,
  type StockMovementRow,
  type UnpaidReservation,
} from "@/lib/admin-api";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/** Las ventas y anulaciones ya traen su texto ("Venta al crédito CR-…"); no se repite el tipo. */
function movementText(type: string, reason: string | null) {
  const label = TYPE_LABEL[type] ?? type;
  if (!reason) return label;
  return /^(Venta|Anulación|Cancelación)/.test(reason) ? reason : `${label} · ${reason}`;
}

const hour = (value: string) =>
  new Date(value).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
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
  const [releasing, setReleasing] = useState<UnpaidReservation | null>(null);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [type, setType] = useState("entry");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 7;
  const historyPages = Math.max(1, Math.ceil(movements.length / historyPageSize));
  const visibleMovements = movements.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize,
  );

  const load = useCallback(() => {
    adminApi.inventoryProducts().then(setProducts).catch(() => {});
    adminApi.inventoryReservations().then(setHolds).catch(() => {});
    adminApi.inventoryMovements().then((d) => setMovements(d.items)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  function open(p: InventoryProduct) {
    setEditing(p);
    setType("entry");
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
          onClick={() => {
            setHistoryPage(1);
            setHistoryOpen(true);
          }}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-50"
        >
          Ver historial ({movements.length})
        </button>
      </div>

      {/* Reservas sin pagar: explican lo "separado" y se pueden liberar. */}
      {holds.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">
            ⏳ {holds.length === 1 ? "Hay 1 pedido sin pagar" : `Hay ${holds.length} pedidos sin pagar`} apartando stock
          </p>
          <p className="mt-0.5 text-xs font-medium text-amber-800">
            Tu stock no se perdió: si el cliente no paga, vuelve solo a la venta a la hora indicada. Si sabes que no va a
            comprar, puedes liberarlo ahora.
          </p>
          <div className="mt-3 space-y-2">
            {holds.map((hold) => (
              <div key={hold.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-200">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {hold.customerName} <span className="font-mono text-xs font-semibold text-slate-400">· {hold.code}</span>
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {hold.items.map((item) => `${item.quantity}× ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-800">Vuelve a las {hour(hold.expiresAt)}</span>
                  <button
                    onClick={() => setReleasing(hold)}
                    className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200"
                  >
                    Liberar ahora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stock actual */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Cantidad total</th>
                <th className="p-4">Separado en pedidos</th>
                <th className="p-4">Puedes vender</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((p) => (
                <tr key={p.id} className="text-slate-800">
                  <td className="p-4 font-bold text-slate-950">{p.name}</td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4 text-slate-500">
                    {p.reserved}
                    {(p.unpaidReserved ?? 0) > 0 && p.unpaidUntil && (
                      <span className="block text-[11px] font-bold text-amber-700">
                        {p.unpaidReserved} sin pagar · vuelve {hour(p.unpaidUntil)}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${p.available <= 5 ? "text-amber-600" : "text-emerald-700"}`}>
                      {p.available}
                    </span>
                    {p.available <= 5 && <span className="ml-1 text-xs text-amber-600">⚠️</span>}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => open(p)} className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100">
                      Cambiar cantidad
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Sin productos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* El historial se abre desde el botón superior para mantener limpia la vista. */}
      {historyOpen && (
        <Overlay onClose={() => setHistoryOpen(false)} size="medium">
          <div className="mb-3 pr-10">
            <h2 className="text-xl font-black text-slate-950">Historial del inventario</h2>
            <p className="mt-1 text-sm text-slate-500">Entradas, devoluciones, ventas y correcciones recientes.</p>
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
          {movements.length === 0 ? (
            <p className="p-6 text-center text-slate-500">Aún no se hicieron cambios de inventario.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {visibleMovements.map((m) => (
                <li key={m.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 text-sm">
                  <div className="min-w-0 sm:grid sm:grid-cols-[1fr_1.2fr] sm:items-center sm:gap-4">
                    <p className="truncate font-bold text-slate-900">{m.productName}</p>
                    <div className="min-w-0 text-xs text-slate-500">
                      <p className="truncate" title={m.reason ?? undefined}>{movementText(m.type, m.reason)}</p>
                      <time>{new Date(m.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
                    </div>
                  </div>
                  <span className={`min-w-16 text-right font-black ${m.quantity >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {m.quantity >= 0 ? "+" : ""}{m.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
          </div>
          {movements.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">Página {historyPage} de {historyPages} · {movements.length} cambios</p>
              <div className="flex gap-2">
                <button type="button" disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Anterior</button>
                <button type="button" disabled={historyPage === historyPages} onClick={() => setHistoryPage((page) => page + 1)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-100 disabled:text-slate-400">Siguiente</button>
              </div>
            </div>
          )}
        </Overlay>
      )}

      {/* Modal de ajuste */}
      {editing && (
        <Overlay onClose={() => setEditing(null)}>
          <h2 className="text-xl font-black text-slate-950">Cambiar cantidad de {editing.name}</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Actualmente puedes vender <strong className="text-slate-800">{editing.available}</strong> unidades.
          </p>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">¿Qué deseas hacer?</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="entry">Agregar productos que compré o recibí</option>
                <option value="return">Volver a sumar un producto devuelto</option>
                <option value="adjustment">Corregir la cantidad total disponible</option>
              </select>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {type === "entry" && "Úsalo cuando recibas mercadería nueva de tu proveedor."}
                {type === "return" && "Úsalo cuando un cliente devuelva un producto que puede venderse otra vez."}
                {type === "adjustment" && "Úsalo después de contar tus productos y encontrar una diferencia."}
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {type === "adjustment" ? "¿Cuántas unidades tienes realmente?" : "¿Cuántas unidades deseas agregar?"}
              </span>
              <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="0" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Escribe una nota (opcional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder={type === "return" ? "Ej: devolución del cliente" : type === "adjustment" ? "Ej: conteo físico del almacén" : "Ej: compra al proveedor"} />
            </label>
            {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg bg-slate-100 py-2 font-semibold text-slate-700">Cancelar</button>
              <button onClick={save} disabled={saving || quantity === ""} className="flex-1 rounded-lg bg-violet-600 py-2 font-semibold text-white disabled:opacity-60">
                {saving ? "Guardando..." : type === "adjustment" ? "Guardar cantidad" : "Agregar unidades"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
      {releasing && (
        <ConfirmDialog
          title={`¿Liberar el pedido ${releasing.code}?`}
          message={`El stock apartado por ${releasing.customerName} vuelve a la venta y el pedido se cancela. Hazlo solo si sabes que no va a pagar.`}
          confirmLabel="Liberar stock"
          onCancel={() => setReleasing(null)}
          onConfirm={async () => {
            await adminApi.releaseReservation(releasing.id).catch(() => undefined);
            setReleasing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
