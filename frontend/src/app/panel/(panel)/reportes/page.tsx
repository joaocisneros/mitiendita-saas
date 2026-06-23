"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type ReportsData } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminApi
      .reports(from || undefined, to || undefined)
      .then((d) => {
        setData(d);
        if (!from) setFrom(d.from);
        if (!to) setTo(d.to);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [from, to]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxRevenue = data
    ? Math.max(...data.salesByDay.map((d) => Number(d.revenue)), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-violet-700">Análisis</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Reportes</h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Desde</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Hasta</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button onClick={load} className="rounded-lg bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700">Aplicar</button>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!data ? (
        <p className="text-slate-400">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Ventas (pagos aprobados)" value={formatPrice(data.totalRevenue)} accent />
            <Stat label="Pedidos pagados" value={String(data.totalOrders)} />
            <Stat label="Días con venta" value={String(data.salesByDay.length)} />
          </div>

          {/* Ventas por día */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 font-black text-slate-950">Ventas por día</h2>
            {data.salesByDay.length === 0 ? (
              <p className="text-sm text-slate-500">Sin ventas en el rango.</p>
            ) : (
              <div className="space-y-2">
                {data.salesByDay.map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-slate-500">{d.date.slice(5)}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded bg-violet-500" style={{ width: `${(Number(d.revenue) / maxRevenue) * 100}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right font-bold text-slate-800">{formatPrice(d.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top productos */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 font-black text-slate-950">Productos más vendidos</h2>
              {data.topProducts.length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : (
                <ol className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 font-black text-violet-700">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold text-slate-900">{p.name}</span>
                      <span className="font-bold text-slate-700">{p.units} u.</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Clientes frecuentes */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 font-black text-slate-950">Clientes frecuentes</h2>
              {data.frequentCustomers.length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : (
                <ul className="space-y-2">
                  {data.frequentCustomers.map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.phone}</p></div>
                      <div className="text-right"><p className="font-bold text-slate-800">{formatPrice(c.total)}</p><p className="text-xs text-slate-500">{c.orders} pedidos</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Pedidos por estado */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 font-black text-slate-950">Pedidos por estado</h2>
            <div className="flex flex-wrap gap-2">
              {data.ordersByStatus.map((s) => (
                <span key={s.status} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                  <StatusBadge status={s.status} />
                  <b className="text-slate-800">{s.count}</b>
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${accent ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-950 ring-slate-200"}`}>
      <p className={`text-xs font-semibold ${accent ? "text-violet-100" : "text-slate-500"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
