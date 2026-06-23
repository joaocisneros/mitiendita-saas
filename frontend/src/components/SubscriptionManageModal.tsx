"use client";

import { useState } from "react";
import { Overlay } from "@/components/OrderDetailModal";
import { superApi, type SubscriptionRow } from "@/lib/superadmin-api";

const STATUS_OPTIONS = [
  { value: "trial", label: "Prueba" },
  { value: "active", label: "Al día" },
  { value: "past_due", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
];

function toInputDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function SubscriptionManageModal({
  row,
  onClose,
  onSaved,
}: {
  row: SubscriptionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(row.subscriptionStatus);
  const [endsAt, setEndsAt] = useState(toInputDate(row.currentPeriodEndsAt));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addDays(days: number) {
    const base = endsAt ? new Date(`${endsAt}T00:00:00`) : new Date();
    const today = new Date();
    const start = base > today ? base : today;
    start.setDate(start.getDate() + days);
    setEndsAt(start.toISOString().slice(0, 10));
  }

  async function run(action: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    try {
      await action();
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
      setSaving(false);
    }
  }

  function save() {
    void run(() =>
      superApi.updateSubscription(row.id, {
        status,
        notes,
        currentPeriodEndsAt: endsAt
          ? new Date(`${endsAt}T00:00:00`).toISOString()
          : undefined,
      }),
    );
  }

  function registerPayment() {
    void run(() => superApi.markPaid(row.id, months));
  }

  return (
    <Overlay onClose={onClose}>
      <div className="space-y-4 pr-9">
        <div>
          <h2 className="text-xl font-black text-slate-950">{row.name}</h2>
          <p className="text-sm text-slate-500">
            {row.subdomain} · {row.plan ?? "Sin plan"}
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">Estado</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">Vence el</span>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950"
            />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-slate-800">Ampliar rápido</span>
          <div className="flex flex-wrap gap-2">
            {[7, 15, 30].map((d) => (
              <button
                key={d}
                onClick={() => addDays(d)}
                className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
              >
                +{d} días
              </button>
            ))}
            {endsAt && (
              <button
                onClick={() => setEndsAt("")}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Sin fecha
              </button>
            )}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">Nota interna</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950"
            placeholder="Acuerdo de pago, observaciones…"
          />
        </label>

        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <p className="text-sm font-bold text-emerald-900">Registrar pago</p>
          <p className="mb-2 text-xs font-medium text-emerald-800">
            Marca la suscripción como activa y extiende el periodo por meses.
          </p>
          <div className="flex gap-2">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="h-9 rounded-lg border border-emerald-300 bg-white px-2 text-sm font-semibold text-emerald-900"
            >
              {[1, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "mes" : "meses"}
                </option>
              ))}
            </select>
            <button
              onClick={registerPayment}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Registrar pago
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-200 pt-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
