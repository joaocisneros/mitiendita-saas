"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminSubscription } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { SubscriptionReceiptModal } from "@/components/receipt/SubscriptionReceiptModal";
import { Skeleton } from "@/components/Skeleton";

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Solicitudes" },
  { value: "proof", label: "Pago en revisión" },
  { value: "active", label: "Activas" },
  { value: "expiring", label: "Por vencer" },
  { value: "expired", label: "Vencidas" },
  { value: "cancelled", label: "Canceladas" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const STATE_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Solicitud recibida", className: "bg-gray-100 text-gray-700" },
  proof: { label: "Pago en revisión", className: "bg-amber-100 text-amber-700" },
  active: { label: "Activa", className: "bg-green-100 text-green-700" },
  expiring: { label: "Por vencer", className: "bg-orange-100 text-orange-700" },
  expired: { label: "Vencida", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", className: "bg-slate-200 text-slate-600" },
};

function displayState(sub: AdminSubscription) {
  if (sub.renewalProofUrl) return "proof";
  return sub.state === "pending" && sub.proofUrl ? "proof" : sub.state;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function toInput(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-CA") : "";
}

export default function SubscriptionsPage() {
  const [all, setAll] = useState<AdminSubscription[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminSubscription | null>(null);
  const [proofPreview, setProofPreview] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [monthsById, setMonthsById] = useState<Record<string, number>>({});
  const monthsFor = (id: string) => monthsById[id] ?? 1;
  const [priceById, setPriceById] = useState<Record<string, string>>({});
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .subscriptions("all")
      .then((data) => {
        setAll(data);
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

  useEffect(() => {
    adminApi.settings().then((s) => setSubdomain(s.subdomain ?? null)).catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const sub of all) {
      const state = displayState(sub);
      c[state] = (c[state] ?? 0) + 1;
    }
    return c;
  }, [all]);

  // Orden fijo (el que ya trae el backend): aprobar/renovar/cancelar nunca mueve la fila de lugar.
  const rows = filter === "all" ? all : all.filter((sub) => displayState(sub) === filter);

  async function act(id: string, action: "activate" | "renew" | "cancel", sub?: AdminSubscription) {
    if (action === "activate" && sub?.price == null) {
      const raw = priceById[id];
      const price = raw ? Number(raw) : NaN;
      if (!raw || Number.isNaN(price) || price <= 0) {
        setError("Ingresa el monto cobrado antes de activar.");
        return;
      }
    }
    setBusyId(id);
    try {
      const price = action === "activate" && sub?.price == null ? Number(priceById[id]) : undefined;
      await adminApi.updateSubscription(id, action, action === "cancel" ? undefined : monthsFor(id), price);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function actRenewal(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      if (decision === "approve") await adminApi.approveSubscriptionRenewal(id);
      else await adminApi.rejectSubscriptionRenewal(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la renovación.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Operaciones</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Solicitudes de planes</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Aquí aparecen los planes solicitados, comprobantes Yape y activaciones del servicio.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
        >
          Actualizar ahora
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
        <b className="text-slate-900">Flujo correcto:</b> solicitud recibida → comprobante en revisión → aprobar y activar → renovar o cancelar.
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
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-7 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">
            No hay solicitudes de planes aquí.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Pago</th>
                  <th className="p-4">Vigencia</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((sub) => {
                  const state = displayState(sub);
                  const isRenewal = Boolean(sub.renewalProofUrl);
                  const meta = isRenewal
                    ? { label: "Renovación en revisión", className: "bg-amber-100 text-amber-700" }
                    : STATE_META[state] ?? { label: sub.state, className: "bg-slate-100 text-slate-700" };
                  const phone = sub.customerPhone.replace(/\D/g, "");
                  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${sub.customerName}, sobre tu solicitud del plan ${sub.planName}:`)}`;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-950">{sub.customerName}</p>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-green-600 hover:underline">
                          {sub.customerPhone}
                        </a>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{sub.planName}</p>
                        {sub.publicCode && <p className="font-mono text-xs text-slate-400">{sub.publicCode}</p>}
                        {sub.note && <p className="text-xs italic text-slate-500">“{sub.note}”</p>}
                      </td>
                      <td className="p-4 text-slate-600">{fmtDateTime(sub.createdAt)}</td>
                      <td className="p-4">
                        {isRenewal ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              Renovar {sub.renewalMonths} {sub.renewalMonths === 1 ? "mes" : "meses"}
                            </span>
                            {sub.renewalDetectedMethod && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold capitalize text-violet-700">
                                {sub.renewalDetectedMethod}
                              </span>
                            )}
                            {sub.renewalOperationNumber && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                                N° op. {sub.renewalOperationNumber}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setProofPreview({ url: sub.renewalProofUrl!, title: `Renovación · ${sub.planName} · ${sub.customerName}` })}
                              className="text-[11px] font-bold text-violet-600 hover:underline"
                            >
                              Ver comprobante →
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            {sub.price != null && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                {formatPrice(sub.price)}
                              </span>
                            )}
                            {sub.detectedMethod && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold capitalize text-violet-700">
                                {sub.detectedMethod}
                              </span>
                            )}
                            {sub.operationNumber && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                                N° op. {sub.operationNumber}
                              </span>
                            )}
                            {sub.proofUrl ? (
                              <button
                                type="button"
                                onClick={() => setProofPreview({ url: sub.proofUrl!, title: `${sub.planName} · ${sub.customerName}` })}
                                className="text-[11px] font-bold text-violet-600 hover:underline"
                              >
                                Ver comprobante →
                              </button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {sub.startsAt || sub.endsAt ? (
                          <>
                            <p>Inicio: {fmtDate(sub.startsAt)}</p>
                            <p className={sub.state === "expired" ? "font-bold text-red-600" : ""}>Vence: {fmtDate(sub.endsAt)}</p>
                            {sub.state === "expiring" && sub.daysLeft !== null && (
                              <p className="font-bold text-orange-600">vence en {sub.daysLeft} día{sub.daysLeft === 1 ? "" : "s"}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sub.proofUrl && subdomain && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReceiptId(sub.id)}
                                className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100"
                              >
                                🧾
                              </button>
                              <a
                                href={`https://wa.me/${phone}?text=${encodeURIComponent(
                                  `Hola ${sub.customerName}, aquí tienes tu comprobante de suscripción: ${window.location.origin}${
                                    sub.publicCode ? `/r/suscripcion/${sub.publicCode}` : `/tienda/${subdomain}/suscripcion/${sub.id}/recibo`
                                  }`,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 hover:bg-green-100"
                              >
                                📲
                              </a>
                            </>
                          )}
                          {isRenewal ? (
                            <>
                              <button
                                disabled={busyId === sub.id}
                                onClick={() => actRenewal(sub.id, "approve")}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Aprobar renovación
                              </button>
                              <button
                                disabled={busyId === sub.id}
                                onClick={() => actRenewal(sub.id, "reject")}
                                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                              >
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <>
                              {sub.state !== "cancelled" && (
                                <select
                                  value={monthsFor(sub.id)}
                                  onChange={(e) => setMonthsById((current) => ({ ...current, [sub.id]: Number(e.target.value) }))}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                                  aria-label="Duración"
                                >
                                  {[1, 3, 6, 12].map((n) => (
                                    <option key={n} value={n}>
                                      {n} {n === 1 ? "mes" : "meses"}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {sub.state === "pending" && sub.price == null && (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.10"
                                  placeholder="Monto S/"
                                  value={priceById[sub.id] ?? ""}
                                  onChange={(e) => setPriceById((current) => ({ ...current, [sub.id]: e.target.value }))}
                                  className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-violet-500"
                                  aria-label="Monto cobrado"
                                />
                              )}
                              {sub.state === "pending" && (
                                <button
                                  disabled={busyId === sub.id}
                                  onClick={() => act(sub.id, "activate", sub)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {sub.proofUrl ? "Aprobar y activar" : "Activar"}
                                </button>
                              )}
                              {(sub.state === "active" || sub.state === "expiring" || sub.state === "expired") && (
                                <button
                                  disabled={busyId === sub.id}
                                  onClick={() => act(sub.id, "renew")}
                                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                  Renovar +
                                </button>
                              )}
                              {sub.state !== "cancelled" && (
                                <button
                                  onClick={() => setEditing(sub)}
                                  title="Editar fechas"
                                  className="rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                  📅
                                </button>
                              )}
                              {sub.state !== "cancelled" && (
                                <button
                                  disabled={busyId === sub.id}
                                  onClick={() => act(sub.id, "cancel")}
                                  title="Cancelar"
                                  className="rounded-full px-2 py-1.5 text-sm font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                                >
                                  ✕
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditDatesModal
          sub={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {proofPreview && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setProofPreview(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-3xl bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setProofPreview(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl font-black text-slate-600 shadow ring-1 ring-slate-200 hover:bg-slate-100"
              aria-label="Cerrar comprobante"
            >
              ×
            </button>
            <div className="mb-3 pr-12">
              <p className="text-sm font-bold text-violet-700">Pago Yape</p>
              <h3 className="text-xl font-black text-slate-950">
                Comprobante de plan
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {proofPreview.title}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofPreview.url}
              alt="Comprobante de pago"
              className="max-h-[72dvh] w-full rounded-2xl bg-slate-100 object-contain ring-1 ring-slate-200"
            />
            <a
              href={proofPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-700"
            >
              Abrir imagen completa
            </a>
          </div>
        </div>
      )}

      {receiptId && subdomain && (
        <SubscriptionReceiptModal
          subdomain={subdomain}
          id={receiptId}
          onClose={() => setReceiptId(null)}
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
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="space-y-3 p-5">
          <p className="text-sm text-slate-600">
            Cliente: <b>{sub.customerName}</b>
          </p>
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
          <p className="text-center text-xs text-slate-500">Al guardar, la solicitud queda activa con estas fechas.</p>
        </div>
      </div>
    </div>
  );
}
