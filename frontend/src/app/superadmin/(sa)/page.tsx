"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart, DonutChart } from "@/components/Charts";
import { CompanyDetailModal } from "@/components/CompanyDetailModal";
import { DashboardIcon } from "@/components/DashboardIcon";
import { formatPrice } from "@/lib/format";
import { superApi, type GlobalStats, type Plan, type SaCompany } from "@/lib/superadmin-api";

const PERIODS = [7, 30, 90] as const;
const SUBSCRIPTION_STATUS = {
  trial: { label: "Prueba", className: "bg-blue-100 text-blue-800" },
  active: { label: "Al día", className: "bg-emerald-100 text-emerald-800" },
  past_due: { label: "Pago vencido", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelada", className: "bg-slate-200 text-slate-700" },
};

export default function SuperDashboard() {
  const [rangeDays, setRangeDays] = useState<(typeof PERIODS)[number]>(30);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<SaCompany[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyCompanyId, setBusyCompanyId] = useState<string | null>(null);

  useEffect(() => {
    superApi.stats(rangeDays).then(setStats).catch((reason) =>
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar las métricas."),
    );
  }, [rangeDays]);

  useEffect(() => {
    Promise.all([superApi.companies({ limit: 6 }), superApi.plans()])
      .then(([result, planRows]) => {
        setCompanies(result.items);
        setPlans(planRows);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar las empresas."),
      );
  }, []);

  async function reloadCompanies() {
    const [result, summary] = await Promise.all([
      superApi.companies({ limit: 6 }),
      superApi.stats(rangeDays),
    ]);
    setCompanies(result.items);
    setStats(summary);
  }

  async function runCompanyAction(companyId: string, action: () => Promise<unknown>) {
    setBusyCompanyId(companyId);
    setError("");
    try {
      await action();
      await reloadCompanies();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la acción.");
    } finally {
      setBusyCompanyId(null);
    }
  }

  async function enterAsSupport(companyId: string) {
    setBusyCompanyId(companyId);
    setError("");
    try {
      const { accessToken } = await superApi.impersonate(companyId);
      localStorage.setItem("mt_access", accessToken);
      window.open("/panel", "_blank", "noopener,noreferrer");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar el modo soporte.");
    } finally {
      setBusyCompanyId(null);
    }
  }

  async function extendTrial(company: SaCompany) {
    const currentEnd = company.currentPeriodEndsAt ? new Date(company.currentPeriodEndsAt) : new Date();
    const base = currentEnd > new Date() ? currentEnd : new Date();
    base.setDate(base.getDate() + 7);
    await runCompanyAction(company.id, () =>
      superApi.updateSubscription(company.id, { status: "trial", currentPeriodEndsAt: base.toISOString() }),
    );
  }

  return (
    <div className="space-y-7 pb-20 md:pb-0">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Centro de control</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Panel global</h1>
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

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <section aria-labelledby="urgent-title" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Prioridad de hoy</p>
            <h2 id="urgent-title" className="mt-1 text-xl font-black text-slate-950">Acciones urgentes</h2>
          </div>
          <Link href="/superadmin/suscripciones" className="text-sm font-bold text-amber-800 hover:underline">Resolver en suscripciones →</Link>
        </div>
        {stats ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AlertCard count={stats.alerts.expiringSoon} title="Vencen en 3 días" text="Contactar o renovar antes del vencimiento." tone="amber" />
            <AlertCard count={stats.alerts.pastDue} title="Pagos pendientes" text="Suscripciones marcadas como vencidas." tone="red" />
            <AlertCard count={stats.alerts.suspendedForDebt} title="Suspendidas por deuda" text="Requieren pago o revisión manual." tone="violet" />
            <AlertCard count={stats.alerts.atRisk} title="Empresas en riesgo" text="Vencidas o sin fecha de renovación." tone="slate" />
          </div>
        ) : <div className="h-28 animate-pulse rounded-xl bg-white/70" />}
      </section>

      {stats ? (
        <section aria-label="Indicadores principales" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon="plans" label="Ingreso mensual recurrente" value={formatPrice(stats.mrr)} accent hint="MRR de planes activos y al día" />
          <Stat icon="store" label="Empresas activas" value={String(stats.activeCompanies)} positive hint={`${stats.totalCompanies} registradas`} />
          <Stat icon="activity" label={`Nuevas · ${rangeDays} días`} value={String(stats.newCompaniesInRange)} trend={stats.growthRate} hint="vs. periodo anterior" />
          <Stat icon="settings" label="Empresas en riesgo" value={String(stats.atRiskCompanies)} warning hint="Requieren seguimiento" />
          <Stat icon="companies" label="Cancelaciones" value={String(stats.cancelledCompaniesInRange)} hint={`Últimos ${rangeDays} días`} />
          <Stat icon="reports" label="Churn" value={`${stats.churnRate}%`} warning={stats.churnRate > 5} hint="Sobre la base inicial" />
          <Stat icon="customers" label="Retención" value={`${stats.retentionRate}%`} positive hint={`Últimos ${rangeDays} días`} />
          <Stat icon="orders" label="Pedidos globales" value={String(stats.totalOrders)} hint={`GMV ${formatPrice(stats.grossVolume)}`} />
        </section>
      ) : <div className="h-56 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />}

      {stats && (
        <section className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Crecimiento de empresas" subtitle="Altas registradas durante los últimos seis meses." className="lg:col-span-2">
            <BarChart data={stats.companiesByMonth.map((item) => ({ label: monthLabel(item.month), value: item.count }))} />
          </ChartCard>
          <ChartCard title="Distribución por plan" subtitle="Composición actual de la cartera.">
            <DonutChart data={stats.planDistribution.map((item, index) => ({ label: item.plan, value: item.count, color: ["#7c3aed", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#94a3b8"][index % 6] }))} />
          </ChartCard>
          <ChartCard title="Volumen de ventas procesado" subtitle="Pedidos aprobados; no representa ingresos por suscripción." className="lg:col-span-3" trailing={`Acumulado: ${formatPrice(stats.grossVolume)}`}>
            <BarChart data={stats.gmvByMonth.map((item) => ({ label: monthLabel(item.month), value: item.total }))} color="#0f766e" format={(value) => formatPrice(value)} />
          </ChartCard>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-black text-slate-950">Empresas recientes</h2><p className="mt-1 text-sm font-medium text-slate-600">Estado comercial y operaciones rápidas.</p></div>
          <Link href="/superadmin/empresas" className="text-sm font-bold text-violet-700 hover:underline">Ver todas →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-600">
              <tr><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Días restantes</th><th className="px-4 py-3">Último pago</th><th className="px-4 py-3 text-right">Control rápido</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {companies.map((company) => {
                const subscription = SUBSCRIPTION_STATUS[company.subscriptionStatus];
                const isBusy = busyCompanyId === company.id;
                const remaining = daysRemaining(company.currentPeriodEndsAt);
                return (
                  <tr key={company.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3"><button onClick={() => setSelectedId(company.id)} className="font-black text-slate-950 hover:text-violet-700">{company.name}</button><p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">{company.subdomain} · {company.owner?.email ?? "Sin propietario"}</p></td>
                    <td className="px-4 py-3">
                      <select value={company.plan?.id ?? ""} disabled={isBusy} onChange={(event) => runCompanyAction(company.id, () => superApi.assignPlan(company.id, Number(event.target.value)))} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 disabled:opacity-50">
                        <option value="" disabled>Sin plan</option>
                        {plans.filter((plan) => plan.isActive || plan.id === company.plan?.id).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${company.status === "active" ? "bg-emerald-100 text-emerald-800" : company.status === "suspended" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700"}`}>{company.status === "active" ? "Tienda activa" : company.status === "suspended" ? "Suspendida" : "Inactiva"}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${subscription.className}`}>{subscription.label}</span></div></td>
                    <td className="px-4 py-3"><p className={`font-bold ${remaining.tone}`}>{remaining.label}</p>{company.subscriptionStatus === "trial" && <button disabled={isBusy} onClick={() => extendTrial(company)} className="mt-1 text-xs font-bold text-violet-700 hover:underline disabled:opacity-50">Extender 7 días</button>}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{company.lastPaymentAt ? new Date(company.lastPaymentAt).toLocaleDateString("es-PE") : "Sin registro"}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button disabled={isBusy} onClick={() => setSelectedId(company.id)} className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50">Ver</button><button disabled={isBusy} onClick={() => enterAsSupport(company.id)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">Soporte</button><button disabled={isBusy} onClick={() => runCompanyAction(company.id, () => company.status === "active" ? superApi.suspend(company.id) : superApi.activate(company.id))} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 ${company.status === "active" ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{isBusy ? "Procesando…" : company.status === "active" ? "Suspender" : "Activar"}</button></div></td>
                  </tr>
                );
              })}
              {companies.length === 0 && <tr><td colSpan={6} className="p-10 text-center font-medium text-slate-500">No hay empresas registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section><h2 className="mb-3 text-lg font-black text-slate-950">Acciones rápidas</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><QuickLink href="/registro" icon="store" title="Registrar empresa" text="Dar de alta una tienda nueva." /><QuickLink href="/superadmin/suscripciones" icon="plans" title="Ver suscripciones" text="Resolver pagos y vencimientos." /><QuickLink href="/superadmin/planes" icon="settings" title="Configurar planes" text="Cambiar precios y límites." /><QuickLink href="/superadmin/actividad" icon="activity" title="Auditar actividad" text="Revisar acciones sensibles." /></div></section>

      {selectedId && <CompanyDetailModal companyId={selectedId} onClose={() => setSelectedId(null)} onChanged={reloadCompanies} />}
    </div>
  );
}

function AlertCard({ count, title, text, tone }: { count: number; title: string; text: string; tone: "amber" | "red" | "violet" | "slate" }) {
  const colors = { amber: "border-amber-200 bg-white text-amber-700", red: "border-red-200 bg-red-50 text-red-700", violet: "border-violet-200 bg-violet-50 text-violet-700", slate: "border-slate-200 bg-slate-50 text-slate-700" };
  return <Link href="/superadmin/suscripciones" className={`rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${colors[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-black">{count}</p><h3 className="mt-1 text-sm font-black text-slate-950">{title}</h3></div><span className="flex h-8 w-8 items-center justify-center rounded-full bg-current/10 text-sm font-black">!</span></div><p className="mt-2 text-xs font-medium leading-5 text-slate-600">{count === 0 ? "Sin pendientes por ahora." : text}</p></Link>;
}

type StatIcon = "companies" | "store" | "settings" | "orders" | "plans" | "activity" | "reports" | "customers";
function Stat({ icon, label, value, hint, accent, positive, warning, trend }: { icon: StatIcon; label: string; value: string; hint: string; accent?: boolean; positive?: boolean; warning?: boolean; trend?: number }) {
  return <div className={`rounded-2xl p-5 shadow-sm ring-1 ${accent ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-950 ring-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-white/15" : warning ? "bg-amber-100 text-amber-800" : positive ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-700"}`}><DashboardIcon name={icon} /></span>{trend !== undefined && <span className={`rounded-full px-2 py-1 text-[11px] font-black ${trend >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{trend >= 0 ? "+" : ""}{trend}%</span>}</div><p className={`mt-4 text-[11px] font-bold uppercase tracking-wide ${accent ? "text-violet-100" : "text-slate-600"}`}>{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className={`mt-1 text-xs font-medium ${accent ? "text-violet-100" : "text-slate-500"}`}>{hint}</p></div>;
}

function ChartCard({ title, subtitle, trailing, className = "", children }: { title: string; subtitle: string; trailing?: string; className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}><div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-black text-slate-950">{title}</h2><p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p></div>{trailing && <p className="text-sm font-black text-violet-700">{trailing}</p>}</div>{children}</div>;
}

function QuickLink({ href, icon, title, text }: { href: string; icon: StatIcon; title: string; text: string }) {
  return <Link href={href} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><DashboardIcon name={icon} /></span><h3 className="mt-3 font-black text-slate-950">{title}</h3><p className="mt-1 text-sm font-medium text-slate-600">{text}</p></Link>;
}

function daysRemaining(value: string | null) {
  if (!value) return { label: "Sin fecha", tone: "text-slate-500" };
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Venció hace ${Math.abs(days)} d`, tone: "text-red-700" };
  if (days === 0) return { label: "Vence hoy", tone: "text-red-700" };
  if (days <= 3) return { label: `${days} días`, tone: "text-amber-700" };
  return { label: `${days} días`, tone: "text-slate-700" };
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { month: "short" }).format(new Date(year, month - 1, 1));
}
