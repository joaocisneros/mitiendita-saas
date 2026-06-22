"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type DashboardData } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas de hoy" value={formatPrice(data.salesToday)} accent />
        <Stat label="Pedidos de hoy" value={String(data.ordersToday)} />
        <Stat label="Pendientes" value={String(data.pendingOrders)} />
        <Stat label="Stock bajo" value={String(data.lowStockCount)} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Pedidos recientes</h2>
          <Link href="/panel/pedidos" className="text-sm text-violet-600">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {data.recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              Aún no hay pedidos.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/panel/pedidos/${o.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-xs text-gray-400">{o.publicCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
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
      </section>

      {data.lowStockProducts.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">⚠️ Productos con stock bajo</h2>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <ul className="space-y-1 text-sm">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="font-semibold text-amber-600">
                    {p.available} disp.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ring-1 ring-black/5 ${
        accent ? "bg-violet-600 text-white" : "bg-white"
      }`}
    >
      <p className={`text-xs ${accent ? "text-white/80" : "text-gray-500"}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
