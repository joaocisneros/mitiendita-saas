"use client";

import { useCallback, useEffect, useState } from "react";
import { superApi, type SubscriptionRow } from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    superApi
      .subscriptions(status || undefined)
      .then((r) => setRows(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function markPaid(row: SubscriptionRow) {
    const months = Number(prompt("¿Cuántos meses pagó?", "1") ?? "1");
    if (!months || months < 1) return;
    await superApi.markPaid(row.id, months);
    load();
  }
  async function setState(row: SubscriptionRow, newStatus: string) {
    await superApi.updateSubscription(row.id, { status: newStatus });
    load();
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Comercial</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Suscripciones</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">Controla pagos y vencimientos de cada empresa.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setStatus(f.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold ${status === f.value ? "bg-violet-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Empresa</th><th className="p-4">Plan</th><th className="p-4">Precio</th>
                <th className="p-4">Estado</th><th className="p-4">Vence</th><th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => {
                const st = STATUS[r.subscriptionStatus] ?? STATUS.trial;
                const overdue = r.currentPeriodEndsAt && new Date(r.currentPeriodEndsAt) < new Date();
                return (
                  <tr key={r.id} className="text-slate-800">
                    <td className="p-4"><p className="font-bold text-slate-950">{r.name}</p><p className="text-xs text-slate-500">{r.subdomain}</p></td>
                    <td className="p-4">{r.plan ?? "—"}</td>
                    <td className="p-4 font-semibold">{formatPrice(r.price)}</td>
                    <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span></td>
                    <td className="p-4">
                      <span className={overdue ? "font-bold text-red-600" : "text-slate-600"}>
                        {r.currentPeriodEndsAt ? new Date(r.currentPeriodEndsAt).toLocaleDateString("es-PE") : "—"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => markPaid(r)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Marcar pagado</button>
                        {r.subscriptionStatus !== "past_due" ? (
                          <button onClick={() => setState(r, "past_due")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">Vencer</button>
                        ) : (
                          <button onClick={() => setState(r, "cancelled")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">Cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center font-semibold text-slate-600">Sin suscripciones.</td></tr>
              )}
              {loading && (<tr><td colSpan={6} className="p-10 text-center text-slate-500">Cargando...</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
