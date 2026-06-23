"use client";

import { useCallback, useEffect, useState } from "react";
import { superApi, type Plan, type SaCompany } from "@/lib/superadmin-api";
import { CompanyDetailModal } from "@/components/CompanyDetailModal";

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

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Plataforma</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Empresas</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {total} empresas registradas en total.
        </p>
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
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">Propietario</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Productos</th>
                <th className="p-4">Pedidos</th>
                <th className="p-4">Clientes</th>
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
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {company.subdomain}
                    </p>
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
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedId(company.id)}
                        className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={() => toggle(company)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${company.status === "active" ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
                      >
                        {company.status === "active" ? "Suspender" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && companies.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center font-semibold text-slate-600"
                  >
                    No se encontraron empresas.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={8}
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
    </div>
  );
}
