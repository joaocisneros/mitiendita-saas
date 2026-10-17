"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type CreditCustomer, type CreditSummary } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { DashboardIcon } from "@/components/DashboardIcon";
import { usesCredits } from "@/lib/business-categories";
import { CreditCustomerForm } from "@/components/credits/CreditCustomerForm";
import { CreditCustomerModal } from "@/components/credits/CreditCustomerModal";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "debt", label: "Con deuda" },
  { id: "clear", label: "Al día" },
  { id: "inactive", label: "Desactivadas" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export default function CreditsPage() {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const load = useCallback((term: string, status: FilterId) => {
    setLoading(true);
    setError("");
    Promise.all([
      adminApi.creditSummary(),
      adminApi.creditCustomers({ search: term.trim() || undefined, status }),
    ])
      .then(([nextSummary, list]) => {
        setSummary(nextSummary);
        setCustomers(list.items);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo cargar el módulo."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminApi
      .settings()
      .then((settings) => {
        const ok = usesCredits(settings.businessType);
        setAllowed(ok);
        if (ok) load("", "all");
      })
      .catch(() => setAllowed(false));
  }, [load]);

  const refresh = () => load(search, filter);

  if (allowed === null) {
    return <p className="p-10 text-center font-semibold text-slate-600">Cargando...</p>;
  }
  if (!allowed) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-bold text-slate-800">Ventas al crédito no está disponible para el rubro de tu tienda.</p>
        <p className="mt-1 text-sm font-medium text-slate-600">Está pensado para bodegas, tiendas de ropa, calzado, joyería, tecnología, ferreterías y venta por catálogo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Cobranzas</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Ventas al crédito</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">Entrega productos a tus clientas y registra cada abono hasta que terminen de pagar.</p>
        </div>
        <button onClick={() => setCreating(true)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">
          + Nueva clienta
        </button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Por cobrar" value={formatPrice(summary.receivable)} tone="amber" />
          <SummaryCard label="Cobrado este mes" value={formatPrice(summary.collectedThisMonth)} tone="emerald" />
          <SummaryCard label="Clientas con deuda" value={`${summary.customersWithDebt} de ${summary.customers}`} tone="violet" />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && refresh()}
            placeholder="Buscar por nombre, apellido o celular"
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
          />
          <button onClick={refresh} className="rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800">Buscar</button>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setFilter(item.id); load(search, item.id); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${filter === item.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <p className="p-10 text-center font-semibold text-slate-600">Cargando clientas...</p>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <DashboardIcon name="customers" className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-bold text-slate-800">{filter === "all" && !search ? "Todavía no registras clientas" : "No hay clientas con ese filtro"}</p>
            <p className="mt-1 text-sm font-medium text-slate-600">Registra a tu primera clienta para entregarle productos al crédito.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="p-4">Clienta</th>
                  <th className="p-4">Celular</th>
                  <th className="p-4">Total sacado</th>
                  <th className="p-4">Abonado</th>
                  <th className="p-4">Saldo</th>
                  <th className="p-4">Último abono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((customer) => {
                  const balance = Number(customer.balance ?? 0);
                  return (
                    <tr key={customer.id} onClick={() => setOpenId(customer.id)} className="cursor-pointer hover:bg-violet-50/40">
                      <td className="p-4">
                        <p className="font-bold text-slate-950">
                          {customer.fullName}
                          {!customer.isActive && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Inactiva</span>}
                        </p>
                        <p className="max-w-xs truncate text-xs font-medium text-slate-600">{customer.address}</p>
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        {customer.phone}
                        {customer.documentNumber && <span className="block text-xs font-medium text-slate-500">DNI {customer.documentNumber}</span>}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{formatPrice(customer.totalSold ?? 0)}</td>
                      <td className="p-4 font-semibold text-emerald-700">{formatPrice(customer.totalPaid ?? 0)}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${balance > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {balance > 0 ? formatPrice(balance) : "Al día"}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{customer.lastPaymentAt ? new Date(customer.lastPaymentAt).toLocaleDateString("es-PE") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <CreditCustomerForm
          onClose={() => setCreating(false)}
          onSaved={(customer) => { setCreating(false); refresh(); setOpenId(customer.id); }}
          onOpenExisting={(id) => { setCreating(false); setOpenId(id); }}
        />
      )}
      {openId && (
        <CreditCustomerModal
          customerId={openId}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "amber" | "emerald" | "violet" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    violet: "bg-violet-50 text-violet-900 ring-violet-200",
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
