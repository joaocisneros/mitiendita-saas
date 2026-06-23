"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type InventoryProduct,
  type StockMovementRow,
} from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";

const TYPE_LABEL: Record<string, string> = {
  entry: "Entrada",
  sale: "Venta",
  adjustment: "Ajuste",
  return: "Devolución",
  cancellation: "Cancelación",
};

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [editing, setEditing] = useState<InventoryProduct | null>(null);
  const [type, setType] = useState("entry");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminApi.inventoryProducts().then(setProducts).catch(() => {});
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
    setSaving(true);
    try {
      await adminApi.adjustStock({
        productId: editing.id,
        type,
        quantity: Number(quantity),
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
      <div>
        <p className="text-sm font-bold text-violet-700">Operaciones</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Inventario</h1>
      </div>

      {/* Stock actual */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Reservado</th>
                <th className="p-4">Disponible</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((p) => (
                <tr key={p.id} className="text-slate-800">
                  <td className="p-4 font-bold text-slate-950">{p.name}</td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4 text-slate-500">{p.reserved}</td>
                  <td className="p-4">
                    <span className={`font-bold ${p.available <= 5 ? "text-amber-600" : "text-emerald-700"}`}>
                      {p.available}
                    </span>
                    {p.available <= 5 && <span className="ml-1 text-xs text-amber-600">⚠️</span>}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => open(p)} className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100">
                      Ajustar
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

      {/* Historial de movimientos */}
      <section>
        <h2 className="mb-2 text-lg font-black text-slate-950">Movimientos recientes</h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {movements.length === 0 ? (
            <p className="p-6 text-center text-slate-500">Aún no hay movimientos.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{m.productName}</p>
                    <p className="text-xs text-slate-500">
                      {TYPE_LABEL[m.type] ?? m.type}
                      {m.reason ? ` · ${m.reason}` : ""} ·{" "}
                      {new Date(m.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`font-black ${m.quantity >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {m.quantity >= 0 ? "+" : ""}{m.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Modal de ajuste */}
      {editing && (
        <Overlay onClose={() => setEditing(null)}>
          <h2 className="mb-4 text-xl font-black text-slate-950">Ajustar: {editing.name}</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tipo de movimiento</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="entry">Entrada / reposición (+)</option>
                <option value="return">Devolución (+)</option>
                <option value="adjustment">Ajuste manual (fijar stock exacto)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                {type === "adjustment" ? "Nuevo stock total" : "Cantidad a sumar"}
              </span>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="0" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Motivo (opcional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Ej: compra a proveedor" />
            </label>
            {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg bg-slate-100 py-2 font-semibold text-slate-700">Cancelar</button>
              <button onClick={save} disabled={saving || quantity === ""} className="flex-1 rounded-lg bg-violet-600 py-2 font-semibold text-white disabled:opacity-60">
                {saving ? "Guardando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
