"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminOrderRow } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    adminApi
      .orders({ status: status || undefined })
      .then((d) => setRows(d.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Pedidos</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
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
          <p className="p-6 text-center text-gray-400">Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay pedidos aquí.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/panel/pedidos/${o.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
