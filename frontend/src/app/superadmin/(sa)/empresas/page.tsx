"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { superApi, type Plan, type SaCompany } from "@/lib/superadmin-api";
import { CompanyDetailModal } from "@/components/CompanyDetailModal";
import { CreateCompanyModal } from "@/components/CreateCompanyModal";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<SaCompany[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [planId, setPlanId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    (targetPage = page) => {
      setLoading(true);
      setError("");
      superApi
        .companies({
          search: search.trim() || undefined,
          status: status || undefined,
          planId: planId ? Number(planId) : undefined,
          page: targetPage,
          limit: 20,
        })
        .then((result) => {
          setCompanies(result.items);
          setTotal(result.total);
          setPages(result.pages || 1);
          setPage(result.page);
        })
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las empresas.",
          ),
        )
        .finally(() => setLoading(false));
    },
    [page, planId, search, status],
  );

  useEffect(() => {
    Promise.all([superApi.companies({ page: 1, limit: 20 }), superApi.plans()])
      .then(([result, planRows]) => {
        setCompanies(result.items);
        setTotal(result.total);
        setPages(result.pages || 1);
        setPlans(planRows);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Error"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function toggle(company: SaCompany) {
    if (company.status === "active") await superApi.suspend(company.id);
    else await superApi.activate(company.id);
    load();
  }
  async function assign(company: SaCompany, value: number) {
    await superApi.assignPlan(company.id, value);
    load();
  }

  async function enterSupport(company: SaCompany) {
    const tab = window.open("about:blank", "_blank");
    setBusyId(company.id);
    setError("");
    try {
      const { accessToken } = await superApi.impersonate(company.id);
      localStorage.setItem("mt_access", accessToken);
      localStorage.setItem("mt_impersonating", "1");
      if (tab && !tab.closed) tab.location.href = "/panel";
      else window.location.assign("/panel");
    } catch (reason) {
      if (tab && !tab.closed) tab.close();
      setError(reason instanceof Error ? reason.message : "No se pudo ingresar como soporte.");
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(company: SaCompany) {
    const password = prompt(`Nueva contraseña para ${company.owner?.name ?? company.name} (mínimo 8 caracteres):`);
    if (!password) return;
    if (password.length < 8) return alert("La contraseña debe tener al menos 8 caracteres.");
    setBusyId(company.id);
    try {
      await superApi.resetOwnerPassword(company.id, password);
      alert("Contraseña actualizada correctamente.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar la contraseña.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(company: SaCompany) {
    if (!confirm(`¿Eliminar ${company.name}? La empresa quedará inactiva y oculta.`)) return;
    setBusyId(company.id);
    try {
      await superApi.deleteCompany(company.id);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo eliminar la empresa.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Plataforma</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Empresas</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {total} empresas registradas en total.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
          + Crear empresa
        </button>
      </div>
      <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_180px_200px_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && load(1)}
          placeholder="Nombre o subdominio"
          className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="suspended">Suspendidas</option>
          <option value="inactive">Inactivas</option>
        </select>
        <select
          value={planId}
          onChange={(event) => setPlanId(event.target.value)}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          <option value="">Todos los planes</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => load(1)}
          className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700"
        >
          Aplicar filtros
        </button>
      </section>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">Propietario</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Productos</th>
                <th className="p-4">Pedidos</th>
                <th className="p-4">Clientes</th>
                <th className="p-4">Crédito</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedId(company.id)}
                      className="text-left font-black text-slate-950 hover:text-violet-700"
                    >
                      {company.name}
                    </button>
                    <p className="mt-1 text-xs font-medium text-slate-600">/tienda/{company.subdomain}</p>
                    <Link href={`/tienda/${company.subdomain}`} target="_blank" className="mt-1 inline-flex text-xs font-bold text-violet-700 hover:underline">
                      Abrir tienda ↗
                    </Link>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">
                      {company.owner?.name ?? "Sin propietario"}
                    </p>
                    <p className="text-xs text-slate-600">
                      {company.owner?.email ?? "—"}
                    </p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${company.status === "active" ? "bg-emerald-100 text-emerald-800" : company.status === "suspended" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700"}`}
                    >
                      {company.status === "active"
                        ? "Activa"
                        : company.status === "suspended"
                          ? "Suspendida"
                          : "Inactiva"}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={company.plan?.id ?? ""}
                      onChange={(event) =>
                        assign(company, Number(event.target.value))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-semibold text-slate-800"
                    >
                      {plans
                        .filter(
                          (plan) =>
                            plan.isActive || plan.id === company.plan?.id,
                        )
                        .map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    {company.products}
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    {company.orders}
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    {company.customers}
                  </td>
                  {/* Ventas al crédito: cuántas clientas tiene y cuántas deben. */}
                  <td className="p-4">
                    {company.creditCustomers ? (
                      <div className="leading-tight">
                        <p className="font-bold text-slate-900">
                          {company.creditCustomers}{" "}
                          {company.creditCustomers === 1 ? "clienta" : "clientas"}
                        </p>
                        {company.creditDebtors ? (
                          <p className="text-xs font-semibold text-amber-700">
                            {company.creditDebtors} {company.creditDebtors === 1 ? "debe" : "deben"}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-emerald-700">Todas al día</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Sin crédito</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedId(company.id)}
                        className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
                      >
                        Ver detalle
                      </button>
                      <RowAction icon="support" label="Ingresar como soporte" disabled={busyId === company.id} onClick={() => enterSupport(company)} />
                      <RowAction icon="key" label="Restablecer contraseña" tone="amber" disabled={busyId === company.id} onClick={() => resetPassword(company)} />
                      <RowAction icon={company.status === "active" ? "pause" : "play"} label={company.status === "active" ? "Suspender empresa" : "Activar empresa"} tone={company.status === "active" ? "red" : "emerald"} disabled={busyId === company.id} onClick={() => toggle(company)} />
                      <RowAction icon="trash" label="Eliminar empresa" tone="red" disabled={busyId === company.id} onClick={() => remove(company)} />
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && companies.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-12 text-center font-semibold text-slate-600"
                  >
                    No se encontraron empresas.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-12 text-center font-semibold text-slate-600"
                  >
                    Cargando empresas...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">
            Página {page} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= pages || loading}
              onClick={() => load(page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {selectedId && (
        <CompanyDetailModal
          companyId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => load()}
        />
      )}
      {showCreate && (
        <CreateCompanyModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onCreated={(company) => {
            setShowCreate(false);
            load(1);
            setSelectedId(company.id);
          }}
        />
      )}
    </div>
  );
}

type ActionIcon = "support" | "key" | "pause" | "play" | "trash";

function RowAction({ icon, label, onClick, disabled, tone = "slate" }: { icon: ActionIcon; label: string; onClick: () => void; disabled?: boolean; tone?: "slate" | "amber" | "red" | "emerald" }) {
  const colors = { slate: "bg-slate-100 text-slate-700 hover:bg-slate-200", amber: "bg-amber-50 text-amber-800 hover:bg-amber-100", red: "bg-red-50 text-red-700 hover:bg-red-100", emerald: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" };
  const paths: Record<ActionIcon, React.ReactNode> = {
    support: <><circle cx="12" cy="8" r="3" /><path d="M6 19v-1a6 6 0 0 1 12 0v1M4 12v3M20 12v3" /></>,
    key: <><circle cx="8" cy="12" r="3" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></>,
    pause: <><rect x="7" y="5" width="3" height="14" rx="1" /><rect x="14" y="5" width="3" height="14" rx="1" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
  };
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-wait disabled:opacity-40 ${colors[tone]}`}><svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg></button>;
}
