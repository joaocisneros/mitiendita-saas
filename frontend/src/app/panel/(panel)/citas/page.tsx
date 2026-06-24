"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminAppointment } from "@/lib/admin-api";
import { Skeleton } from "@/components/Skeleton";

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Atendidas" },
  { value: "cancelled", label: "Canceladas" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmada", className: "bg-blue-100 text-blue-800" },
  completed: { label: "Atendida", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelada", className: "bg-slate-200 text-slate-600" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentsPage() {
  const [rows, setRows] = useState<AdminAppointment[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .appointments(status)
      .then((d) => {
        setRows(d);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 20_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function changeStatus(id: string, next: string) {
    setBusyId(id);
    try {
      await adminApi.updateAppointmentStatus(id, next);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Operaciones</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Citas</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Reservas de servicios de tus clientes. Se actualizan automáticamente.</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">Actualizar ahora</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setStatus(f.value); }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
              status === f.value ? "bg-violet-600 text-white" : "bg-white text-gray-700 ring-1 ring-black/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {loading ? (
          <ul className="divide-y divide-black/5">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                <Skeleton className="h-7 w-20 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay citas aquí.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((a) => {
              const meta = STATUS_META[a.status] ?? { label: a.status, className: "bg-slate-100 text-slate-700" };
              const phone = a.customerPhone.replace(/\D/g, "");
              const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${a.customerName}, sobre tu reserva de ${a.serviceName}:`)}`;
              return (
                <li key={a.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                      <p className="font-bold text-slate-900">{a.serviceName}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      📅 {fmt(a.preferredAt)} · 👤 {a.customerName} ·{" "}
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600 hover:underline">{a.customerPhone}</a>
                    </p>
                    {a.note && <p className="mt-0.5 text-xs italic text-slate-500">“{a.note}”</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {a.status === "pending" && (
                      <button disabled={busyId === a.id} onClick={() => changeStatus(a.id, "confirmed")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">Confirmar</button>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <>
                        <button disabled={busyId === a.id} onClick={() => changeStatus(a.id, "completed")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Atendida</button>
                        <button disabled={busyId === a.id} onClick={() => changeStatus(a.id, "cancelled")} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">Cancelar</button>
                      </>
                    )}
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600">💬 WhatsApp</a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
