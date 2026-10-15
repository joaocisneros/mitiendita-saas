"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type ReportsData } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel } from "@/components/StatusBadge";
import { BarChart, DonutChart } from "@/components/Charts";

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedRange, setAppliedRange] = useState("");

  const load = useCallback(() => {
    if (from && to && from > to) {
      setError("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setLoading(true);
    setError("");
    adminApi
      .reports(from || undefined, to || undefined)
      .then((d) => {
        setData(d);
        if (!from) setFrom(d.from);
        if (!to) setTo(d.to);
        setAppliedRange(`${d.from} al ${d.to}`);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo actualizar el reporte."))
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Análisis</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Reportes de ventas</h1>
          <p className="mt-1 text-sm text-slate-500">Compara ventas, pedidos, productos y clientes.{appliedRange && <span className="ml-1 font-semibold text-slate-700">Periodo: {appliedRange}</span>}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
          <label className="text-xs"><span className="mb-1 block font-semibold text-slate-600">Desde</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-slate-300 px-2" /></label>
          <label className="text-xs"><span className="mb-1 block font-semibold text-slate-600">Hasta</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-slate-300 px-2" /></label>
          <button onClick={load} disabled={loading} className="h-9 min-w-28 rounded-lg bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">{loading ? "Actualizando…" : "Actualizar"}</button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {!data ? (
        <p className="text-slate-400">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Ventas (pagos aprobados)" value={formatPrice(data.totalRevenue)} accent />
            <Stat label="Pedidos pagados" value={String(data.totalOrders)} />
            <Stat label="Días con venta" value={String(data.salesByDay.length)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
              <div className="mb-2"><h2 className="font-black text-slate-950">Ventas por día</h2><p className="text-xs text-slate-500">Solo considera pagos aprobados.</p></div>
              <BarChart height={155} data={data.salesByDay.map((day) => ({ label: day.date.slice(5), value: Number(day.revenue) }))} format={(value) => formatPrice(value)} />
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-2 font-black text-slate-950">Pedidos por estado</h2>
              {data.ordersByStatus.length > 0 ? <DonutChart size={125} data={data.ordersByStatus.map((item, index) => ({ label: orderStatusLabel(item.status), value: item.count, color: ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#64748b"][index % 6] }))} /> : <div className="flex h-[155px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">Sin pedidos en este periodo.</div>}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top productos */}
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 font-black text-slate-950">Productos más vendidos</h2>
              {data.topProducts.length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : (
                <ol className="space-y-2">
                  {data.topProducts.slice(0, 5).map((p, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 font-black text-violet-700">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold text-slate-900">{p.name}</span>
                      <div className="text-right"><p className="font-bold text-slate-700">{p.units} unidades</p><p className="text-xs text-slate-500">{formatPrice(p.revenue)}</p></div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Clientes frecuentes */}
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 font-black text-slate-950">Clientes frecuentes</h2>
              {data.frequentCustomers.length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : (
                <ul className="space-y-2">
                  {data.frequentCustomers.slice(0, 5).map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-500">{c.phone}</p></div>
                      <div className="text-right"><p className="font-bold text-slate-800">{formatPrice(c.total)}</p><p className="text-xs text-slate-500">{c.orders} pedidos</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

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
