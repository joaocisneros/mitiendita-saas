"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart, DonutChart } from "@/components/Charts";
import { DashboardIcon } from "@/components/DashboardIcon";
import { formatPrice } from "@/lib/format";
import { superApi, type GlobalStats } from "@/lib/superadmin-api";

const PERIODS = [7, 30, 90] as const;
export default function SuperDashboard() {
  const [rangeDays, setRangeDays] = useState<(typeof PERIODS)[number]>(30);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    setStatsError("");
    superApi.stats(rangeDays)
      .then((result) => {
        setStats(result);
        setStatsError("");
      })
      .catch((reason) =>
        setStatsError(
          reason instanceof Error
            ? `Métricas: ${reason.message}`
            : "No se pudieron cargar las métricas.",
        ),
      );
  }, [rangeDays]);

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Centro de control</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">Panel global</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Prioridades comerciales, salud de suscripciones y operación de la plataforma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200" aria-label="Periodo de métricas">
            {PERIODS.map((days) => (
              <button key={days} onClick={() => setRangeDays(days)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${rangeDays === days ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {days} días
              </button>
            ))}
          </div>
          <Link href="/superadmin/empresas" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
            Administrar empresas
          </Link>
        </div>
      </header>

      {statsError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {statsError}
        </p>
      )}

      {stats ? (
        <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon="plans" label="Ingreso mensual recurrente" value={formatPrice(stats.mrr)} accent hint="MRR de planes activos y al día" />
          <Stat icon="store" label="Empresas activas" value={String(stats.activeCompanies)} positive hint={`${stats.totalCompanies} registradas`} />
          <Stat icon="activity" label={`Nuevas · ${rangeDays} días`} value={String(stats.newCompaniesInRange)} trend={stats.growthRate} hint="vs. periodo anterior" />
          <Stat icon="orders" label="Pedidos globales" value={String(stats.totalOrders)} hint={`GMV ${formatPrice(stats.grossVolume)}`} />
        </section>
      ) : <div className="h-56 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />}

      {stats && (
        <section className="grid gap-5 xl:grid-cols-12">
          <ChartCard title="Evolución de la plataforma" subtitle="Crecimiento comercial y ventas de los últimos seis meses." className="xl:col-span-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-slate-800">Nuevas empresas</p><span className="text-xs font-bold text-violet-700">{stats.newCompaniesInRange} en {rangeDays} días</span></div>
                <BarChart height={170} data={stats.companiesByMonth.map((item) => ({ label: monthLabel(item.month), value: item.count }))} />
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-slate-800">Ventas procesadas</p><span className="text-xs font-bold text-emerald-700">{formatPrice(stats.grossVolume)}</span></div>
                <BarChart height={170} data={stats.gmvByMonth.map((item) => ({ label: monthLabel(item.month), value: item.total }))} color="#0f766e" format={(value) => formatPrice(value)} />
              </div>
            </div>
          </ChartCard>
          <ChartCard title="Cartera por plan" subtitle="Distribución actual de empresas." className="xl:col-span-4">
            <div className="flex min-h-56 items-center justify-center">
              <DonutChart size={160} data={stats.planDistribution.map((item, index) => ({ label: item.plan, value: item.count, color: ["#7c3aed", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#94a3b8"][index % 6] }))} />
            </div>
          </ChartCard>
        </section>
      )}

    </div>
  );
}

type StatIcon = "companies" | "store" | "settings" | "orders" | "plans" | "activity" | "reports" | "customers";
function Stat({ icon, label, value, hint, accent, positive, warning, trend }: { icon: StatIcon; label: string; value: string; hint: string; accent?: boolean; positive?: boolean; warning?: boolean; trend?: number }) {
  return <div className={`rounded-2xl p-4 shadow-sm ring-1 ${accent ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white ring-violet-600" : "bg-white text-slate-950 ring-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? "bg-white/15" : warning ? "bg-amber-100 text-amber-800" : positive ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-700"}`}><DashboardIcon name={icon} /></span>{trend !== undefined && <span className={`rounded-full px-2 py-1 text-[11px] font-black ${trend >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{trend >= 0 ? "+" : ""}{trend}%</span>}</div><p className={`mt-3 text-[10px] font-bold uppercase tracking-wide ${accent ? "text-violet-100" : "text-slate-600"}`}>{label}</p><p className="mt-0.5 text-2xl font-black">{value}</p><p className={`mt-0.5 text-xs font-medium ${accent ? "text-violet-100" : "text-slate-500"}`}>{hint}</p></div>;
}

function ChartCard({ title, subtitle, trailing, className = "", children }: { title: string; subtitle: string; trailing?: string; className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}><div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-black text-slate-950">{title}</h2><p className="text-xs font-medium text-slate-500">{subtitle}</p></div>{trailing && <p className="text-sm font-black text-violet-700">{trailing}</p>}</div>{children}</div>;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { month: "short" }).format(new Date(year, month - 1, 1));
}
