"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminSubscription } from "@/lib/admin-api";
import { Skeleton } from "@/components/Skeleton";

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "expiring", label: "Por vencer" },
  { value: "expired", label: "Vencidas" },
  { value: "pending", label: "Pendientes" },
  { value: "cancelled", label: "Canceladas" },
] as const;

const STATE_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  active: { label: "Activa", className: "bg-emerald-100 text-emerald-800" },
  expiring: { label: "Por vencer", className: "bg-orange-100 text-orange-800" },
  expired: { label: "Vencida", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", className: "bg-slate-200 text-slate-600" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
function toInput(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-CA") : ""; // YYYY-MM-DD local
}

export default function SubscriptionsPage() {
  const [all, setAll] = useState<AdminSubscription[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminSubscription | null>(null);
  const [monthsById, setMonthsById] = useState<Record<string, number>>({});
  const monthsFor = (id: string) => monthsById[id] ?? 1;

  const load = useCallback(() => {
    adminApi
      .subscriptions("all")
      .then((d) => {
        setAll(d);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const s of all) c[s.state] = (c[s.state] ?? 0) + 1;
    return c;
  }, [all]);

  const rows = filter === "all" ? all : all.filter((s) => s.state === filter);

  async function act(id: string, action: "activate" | "renew" | "cancel") {
    setBusyId(id);
    try {
      await adminApi.updateSubscription(id, action, action === "cancel" ? undefined : monthsFor(id));
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
          <h1 className="mt-1 text-3xl font-black text-slate-950">Suscripciones</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Controla los planes activos y los que están por vencer para renovarlos a tiempo.</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50">Actualizar ahora</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
              filter === f.value ? "bg-violet-600 text-white" : "bg-white text-gray-700 ring-1 ring-black/10"
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 text-xs font-bold ${filter === f.value ? "bg-white/25" : "bg-slate-100 text-slate-600"}`}>
              {counts[f.value] ?? 0}
            </span>
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
                <Skeleton className="h-7 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay suscripciones aquí.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((s) => {
              const meta = STATE_META[s.state] ?? { label: s.state, className: "bg-slate-100 text-slate-700" };
              const phone = s.customerPhone.replace(/\D/g, "");
              const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${s.customerName}, sobre tu suscripción a ${s.planName}:`)}`;
              return (
                <li key={s.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                      <p className="font-bold text-slate-900">{s.planName}</p>
                      {s.state === "expiring" && s.daysLeft !== null && (
                        <span className="text-xs font-bold text-orange-600">⏳ vence en {s.daysLeft} día{s.daysLeft === 1 ? "" : "s"}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      👤 {s.customerName} ·{" "}
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600 hover:underline">{s.customerPhone}</a>
                    </p>
                    {(s.startsAt || s.endsAt) && (
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        🟢 Inicio: <b>{fmtDate(s.startsAt)}</b> &nbsp;·&nbsp; 🔴 Vence: <b className={s.state === "expired" ? "text-red-600" : ""}>{fmtDate(s.endsAt)}</b>
                      </p>
                    )}
                    {s.note && <p className="mt-0.5 text-xs italic text-slate-500">“{s.note}”</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {s.state !== "cancelled" && (
                      <select
                        value={monthsFor(s.id)}
                        onChange={(e) => setMonthsById((m) => ({ ...m, [s.id]: Number(e.target.value) }))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                        aria-label="Duración"
                      >
                        {[1, 3, 6, 12].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "mes" : "meses"}</option>
                        ))}
                      </select>
                    )}
                    {s.state === "pending" && (
                      <button disabled={busyId === s.id} onClick={() => act(s.id, "activate")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Activar</button>
                    )}
                    {(s.state === "active" || s.state === "expiring" || s.state === "expired") && (
                      <button disabled={busyId === s.id} onClick={() => act(s.id, "renew")} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">Renovar +</button>
                    )}
                    {s.state !== "cancelled" && (
                      <button onClick={() => setEditing(s)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">✎ Editar fechas</button>
                    )}
                    {s.state !== "cancelled" && (
                      <button disabled={busyId === s.id} onClick={() => act(s.id, "cancel")} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">Cancelar</button>
                    )}
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600">💬 WhatsApp</a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <EditDatesModal
          sub={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function EditDatesModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: AdminSubscription;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState(toInput(sub.startsAt) || new Date().toLocaleDateString("en-CA"));
  const [end, setEnd] = useState(toInput(sub.endsAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!end) {
      setError("Indica la fecha de vencimiento.");
      return;
    }
    if (start && end <= start) {
      setError("El vencimiento debe ser posterior al inicio.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.editSubscription(
        sub.id,
        new Date(`${start}T12:00:00`).toISOString(),
        new Date(`${end}T12:00:00`).toISOString(),
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between bg-violet-600 px-5 py-4 text-white">
          <h2 className="text-base font-black">Editar fechas — {sub.planName}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
        </header>
        <div className="space-y-3 p-5">
          <p className="text-sm text-slate-600">Cliente: <b>{sub.customerName}</b></p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Fecha de inicio</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Fecha de vencimiento *</span>
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
          </label>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button onClick={save} disabled={saving} className="w-full rounded-full bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar fechas"}
          </button>
          <p className="text-center text-xs text-slate-500">Al guardar, la suscripción queda activa con estas fechas.</p>
        </div>
      </div>
    </div>
  );
}
