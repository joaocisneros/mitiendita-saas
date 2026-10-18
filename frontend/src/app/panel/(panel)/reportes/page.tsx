"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type CreditsReport, type ReportsData } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel } from "@/components/StatusBadge";
import { BarChart, DonutChart } from "@/components/Charts";
import { usesCredits } from "@/lib/business-categories";

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedRange, setAppliedRange] = useState("");
  const [showCredits, setShowCredits] = useState(false);

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
    adminApi.settings().then((s) => setShowCredits(usesCredits(s.businessType))).catch(() => {});
  }, []);
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
          {showCredits && data.credits && (
            <section className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Dinero cobrado en el periodo</p>
              <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Money label="💰 Total cobrado" value={Number(data.totalRevenue) + Number(data.credits.collected)} strong />
                <Money label="🛒 Tienda virtual" value={Number(data.totalRevenue)} />
                <Money label="🤝 Abonos de créditos" value={Number(data.credits.collected)} />
                <Money label="📦 Entregado al crédito" value={Number(data.credits.soldTotal)} subtle />
                <Money label="⏳ Falta cobrar (créditos)" value={Number(data.credits.receivable)} muted />
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                Total cobrado = pedidos de la tienda con pago aprobado + abonos recibidos al crédito. Lo entregado al crédito
                solo se cuenta como cobrado cuando la clienta abona.
              </p>
            </section>
          )}

          <SectionTitle icon="🛒" title="Tienda virtual" hint="Pedidos hechos en tu tienda online con pago aprobado." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Ventas totales (pagos aprobados)" value={formatPrice(data.totalRevenue)} accent />
            <Stat label="Pedidos pagados" value={String(data.totalOrders)} />
            <Stat label="Días con venta" value={String(data.salesByDay.length)} />
            <Best label="Mejor cliente" name={data.frequentCustomers[0]?.name} detail={data.frequentCustomers[0] ? `${formatPrice(data.frequentCustomers[0].total)} · ${data.frequentCustomers[0].orders} pedidos` : undefined} />
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

          {showCredits && data.credits && <CreditsSection credits={data.credits} />}
        </>
      )}
    </div>
  );
}

function SectionTitle({ icon, title, hint, action }: { icon: string; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-t border-slate-200 pt-4">
      <div>
        <h2 className="text-lg font-black text-slate-950"><span aria-hidden>{icon}</span> {title}</h2>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      {action}
    </div>
  );
}

function Money({ label, value, strong, muted, subtle }: { label: string; value: number; strong?: boolean; muted?: boolean; subtle?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${strong ? "bg-violet-600" : subtle ? "bg-white/5 ring-1 ring-white/10" : "bg-white/10"}`}>
      <p className={`text-xs font-semibold ${muted ? "text-amber-300" : "text-slate-300"}`}>{label}</p>
      <p className={`mt-1 font-black ${strong ? "text-2xl" : "text-xl"} ${muted ? "text-amber-200" : "text-white"}`}>{formatPrice(value)}</p>
    </div>
  );
}

function Best({ label, name, detail }: { label: string; name?: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="text-xs font-semibold text-amber-800">⭐ {label}</p>
      <p className="mt-1 truncate text-lg font-black text-slate-950">{name ?? "Sin datos aún"}</p>
      {detail && <p className="text-xs font-semibold text-slate-600">{detail}</p>}
    </div>
  );
}

function Stat({ label, value, accent, accentGreen, warn }: { label: string; value: string; accent?: boolean; accentGreen?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${accent ? "bg-violet-600 text-white ring-violet-600" : accentGreen ? "bg-emerald-600 text-white ring-emerald-600" : warn ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-white text-slate-950 ring-slate-200"}`}>
      <p className={`text-xs font-semibold ${accent ? "text-violet-100" : accentGreen ? "text-emerald-50" : "text-slate-500"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

/** Ventas al crédito del periodo: lo entregado, lo cobrado y quién debe. */
function CreditsSection({ credits }: { credits: CreditsReport }) {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon="🤝"
        title="Ventas al crédito"
        hint="Productos entregados para pagar en abonos. No se mezcla con la tienda virtual."
        action={<Link href="/panel/creditos" className="text-sm font-bold text-violet-700 hover:underline">Ir a Créditos →</Link>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Cobrado en abonos (${credits.paymentsCount} ${credits.paymentsCount === 1 ? "abono" : "abonos"})`} value={formatPrice(credits.collected)} accentGreen />
        <Stat label={`Entregado al crédito (${credits.salesCount} ${credits.salesCount === 1 ? "venta" : "ventas"})`} value={formatPrice(credits.soldTotal)} />
        <Stat label={`Falta cobrar · ${credits.customersWithDebt} de ${credits.customers} clientas`} value={formatPrice(credits.receivable)} warn={Number(credits.receivable) > 0} />
        <Best
          label="Mejor clienta (la que más compró)"
          name={credits.topBuyers[0]?.name}
          detail={credits.topBuyers[0] ? `${formatPrice(credits.topBuyers[0].bought)} · ${credits.topBuyers[0].units} productos · ${Number(credits.topBuyers[0].balance) > 0 ? `debe ${formatPrice(credits.topBuyers[0].balance)}` : "al día ✓"}` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
          <div className="mb-2"><h3 className="font-black text-slate-950">Cobrado por día</h3><p className="text-xs text-slate-500">Abonos recibidos en el periodo.</p></div>
          <BarChart height={155} data={credits.byDay.map((day) => ({ label: day.date.slice(5), value: Number(day.collected) }))} format={(value) => formatPrice(value)} />
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="font-black text-slate-950">Mejores clientas 🎁</h3>
          <p className="mb-3 text-xs text-slate-500">Las que más compraron en el periodo. Ideal para dar un regalo.</p>
          {credits.topBuyers.length === 0 ? <p className="text-sm text-slate-500">Sin compras al crédito en este periodo.</p> : (
            <ol className="space-y-2">
              {credits.topBuyers.map((b, i) => (
                <li key={b.phone} className="flex items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-black text-amber-800">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">{b.units} productos · {Number(b.balance) > 0 ? <span className="font-semibold text-amber-700">debe {formatPrice(b.balance)}</span> : <span className="font-semibold text-emerald-700">al día ✓</span>}</p>
                  </div>
                  <p className="font-black text-slate-900">{formatPrice(b.bought)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 font-black text-slate-950">Quiénes deben más</h3>
          {credits.topDebtors.length === 0 ? <p className="text-sm text-slate-500">Nadie tiene deuda. 🎉</p> : (
            <ul className="space-y-2">
              {credits.topDebtors.map((d) => (
                <li key={d.phone} className="flex items-center justify-between text-sm">
                  <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.phone}</p></div>
                  <p className="font-black text-amber-700">{formatPrice(d.balance)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
        <h3 className="mb-3 font-black text-slate-950">Productos más entregados al crédito</h3>
        {credits.topProducts.length === 0 ? <p className="text-sm text-slate-500">Sin ventas al crédito en este periodo.</p> : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {credits.topProducts.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-black text-amber-800">{i + 1}</span>
                <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.units} u. · {formatPrice(p.total)}</p></div>
              </li>
            ))}
          </ol>
        )}
      </section>
      </div>
    </section>
  );
}
