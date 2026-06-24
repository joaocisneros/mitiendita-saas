"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminOrderRow } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { Skeleton } from "@/components/Skeleton";

const FILTERS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "preparing", label: "Preparando" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

export default function OrdersListPage() {
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .orders({ status: status || undefined, search: appliedSearch || undefined })
      .then((d) => {
        setRows(d.items);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [status, appliedSearch]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold text-violet-700">Operaciones</p><h1 className="mt-1 text-3xl font-black text-slate-950">Pedidos</h1><p className="mt-1 text-xs font-medium text-slate-500">Los nuevos pedidos y comprobantes se actualizan automáticamente.</p></div>
        <button onClick={() => { setLoading(true); load(); }} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">Actualizar ahora</button>
      </div>

      <div className="flex max-w-xl gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setLoading(true); setAppliedSearch(search.trim()); } }} placeholder="Código, cliente o teléfono" className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600" /><button onClick={() => { setLoading(true); setAppliedSearch(search.trim()); }} className="rounded-xl bg-violet-600 px-5 text-sm font-bold text-white">Buscar</button></div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setStatus(f.value); }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
              status === f.value
                ? "bg-violet-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-black/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {loading ? (
          <ul className="divide-y divide-black/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay pedidos aquí.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setSelectedId(o.id)}
                  className="flex w-full flex-col gap-3 px-4 py-3 text-left hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.customerName}</p>
                    <p className="text-xs text-gray-400">
                      {o.publicCode} ·{" "}
                      {new Date(o.createdAt).toLocaleString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={o.paymentStatus} type="payment" />
                    <StatusBadge status={o.status} />
                    <span className="font-bold">
                      {formatPrice(o.total, o.currency)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
