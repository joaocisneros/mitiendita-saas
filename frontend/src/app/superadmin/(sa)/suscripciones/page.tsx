"use client";

import { useCallback, useEffect, useState } from "react";
import { superApi, type SubscriptionRow } from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";
import { SubscriptionManageModal } from "@/components/SubscriptionManageModal";

const STATUS: Record<string, { label: string; cls: string }> = {
  trial: { label: "Prueba", cls: "bg-blue-100 text-blue-800" },
  active: { label: "Al día", cls: "bg-emerald-100 text-emerald-800" },
  past_due: { label: "Vencido", cls: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", cls: "bg-slate-200 text-slate-700" },
};

const FILTERS = [
  { value: "", label: "Todas" },
  { value: "trial", label: "En prueba" },
  { value: "active", label: "Al día" },
  { value: "past_due", label: "Vencidas" },
  { value: "cancelled", label: "Canceladas" },
];

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [managing, setManaging] = useState<SubscriptionRow | null>(null);

  const load = useCallback(
    (targetPage = 1) => {
      setLoading(true);
      setError("");
      superApi
        .subscriptions(status || undefined, applied || undefined, targetPage)
        .then((result) => {
          setRows(result.items);
          setPage(result.page);
          setPages(result.pages || 1);
          setTotal(result.total);
        })
        .catch((reason) =>
          setError(reason instanceof Error ? reason.message : "Error"),
        )
        .finally(() => setLoading(false));
    },
    [status, applied],
  );
  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Comercial</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Suscripciones</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {total} empresas · controla pagos y vencimientos.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold ${status === f.value ? "bg-violet-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setApplied(search.trim())}
            placeholder="Empresa o subdominio"
            className="h-10 w-56 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
          />
          <button
            onClick={() => setApplied(search.trim())}
            className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700"
          >
            Buscar
          </button>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Vence</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => {
                const st = STATUS[r.subscriptionStatus] ?? STATUS.trial;
                const overdue =
                  r.currentPeriodEndsAt &&
                  new Date(r.currentPeriodEndsAt) < new Date();
                return (
                  <tr key={r.id} className="text-slate-800">
                    <td className="p-4">
                      <p className="font-bold text-slate-950">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.subdomain}</p>
                      {r.notes && (
                        <p className="mt-1 max-w-xs truncate text-xs italic text-slate-400">
                          {r.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-4">{r.plan ?? "—"}</td>
                    <td className="p-4 font-semibold">{formatPrice(r.price)}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={overdue ? "font-bold text-red-600" : "text-slate-600"}>
                        {r.currentPeriodEndsAt
                          ? new Date(r.currentPeriodEndsAt).toLocaleDateString("es-PE")
                          : "Sin fecha"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setManaging(r)}
                        className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center font-semibold text-slate-600">
                    Sin suscripciones.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    Cargando...
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

      {managing && (
        <SubscriptionManageModal
          row={managing}
          onClose={() => setManaging(null)}
          onSaved={() => load(page)}
        />
      )}
    </div>
  );
}
