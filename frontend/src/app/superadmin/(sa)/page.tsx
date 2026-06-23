"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  superApi,
  type GlobalStats,
  type SaCompany,
} from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";
import { DashboardIcon } from "@/components/DashboardIcon";
import { CompanyDetailModal } from "@/components/CompanyDetailModal";

export default function SuperDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<SaCompany[]>([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([superApi.stats(), superApi.companies({ limit: 6 })])
      .then(([summary, result]) => {
        setStats(summary);
        setCompanies(result.items);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el dashboard.",
        ),
      );
  }, []);

  return (
    <div className="space-y-7 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Vista general</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Dashboard global
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Supervisa el estado y crecimiento de toda la plataforma.
          </p>
        </div>
        <Link
          href="/superadmin/empresas"
          className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
        >
          Administrar empresas
        </Link>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {stats ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Stat
            icon="companies"
            label="Empresas"
            value={String(stats.totalCompanies)}
          />
          <Stat
            icon="store"
            label="Activas"
            value={String(stats.activeCompanies)}
            positive
          />
          <Stat
            icon="settings"
            label="Suspendidas"
            value={String(stats.suspendedCompanies)}
          />
          <Stat
            icon="orders"
            label="Pedidos"
            value={String(stats.totalOrders)}
          />
          <Stat
            icon="activity"
            label="Nuevas este mes"
            value={String(stats.newCompaniesThisMonth)}
          />
          <Stat
            icon="plans"
            label="Volumen bruto"
            value={formatPrice(stats.grossVolume)}
            accent
          />
        </section>
      ) : (
        <div className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
      )}

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Empresas recientes
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Últimos negocios registrados.
            </p>
          </div>
          <Link
            href="/superadmin/empresas"
            className="text-sm font-bold text-violet-700 hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        <div className="divide-y divide-slate-200">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => setSelectedId(company.id)}
              className="flex w-full flex-col gap-2 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-950">
                  {company.name}
                </p>
                <p className="truncate text-xs font-medium text-slate-600">
                  {company.subdomain} ·{" "}
                  {company.owner?.email ?? "Sin propietario"}
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${company.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
              >
                {company.status === "active" ? "Activa" : "Suspendida"}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {company.orders} pedidos
              </span>
            </button>
          ))}
          {!error && companies.length === 0 && (
            <p className="p-8 text-center font-medium text-slate-600">
              No hay empresas registradas.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLink
          href="/superadmin/empresas"
          icon="companies"
          title="Gestionar empresas"
          text="Busca, filtra, cambia planes y controla accesos."
        />
        <QuickLink
          href="/superadmin/planes"
          icon="plans"
          title="Configurar planes"
          text="Define precios, límites y disponibilidad comercial."
        />
        <QuickLink
          href="/superadmin/actividad"
          icon="activity"
          title="Revisar actividad"
          text="Consulta quién realizó cada acción sensible."
        />
      </section>

      {selectedId && (
        <CompanyDetailModal
          companyId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

type StatIcon =
  | "companies"
  | "store"
  | "settings"
  | "orders"
  | "plans"
  | "activity";
function Stat({
  icon,
  label,
  value,
  accent,
  positive,
}: {
  icon: StatIcon;
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ring-1 ${accent ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-950 ring-slate-200"}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-white/15" : positive ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-700"}`}
      >
        <DashboardIcon name={icon} />
      </span>
      <p
        className={`mt-4 text-[11px] font-bold uppercase tracking-wide ${accent ? "text-violet-100" : "text-slate-600"}`}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
function QuickLink({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: "companies" | "plans" | "activity";
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <DashboardIcon name={icon} />
      </span>
      <h3 className="mt-4 font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
        {text}
      </p>
    </Link>
  );
}
