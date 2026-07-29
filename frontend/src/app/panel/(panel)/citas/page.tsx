"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminAppointment } from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";
import { AppointmentReceiptModal } from "@/components/receipt/AppointmentReceiptModal";
import { Skeleton } from "@/components/Skeleton";

/** Una sola clave de estado por fila: el pago mientras no esté aprobado, y la cita una vez que sí. */
function displayKey(a: AdminAppointment): string {
  if (a.status !== "cancelled" && a.paymentMode === "advance" && a.paymentStatus !== "approved") {
    return a.paymentStatus === "proof_submitted" || a.paymentStatus === "rejected" ? a.paymentStatus : "unpaid";
  }
  return a.status;
}

const STATE_META: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Sin pagar", className: "bg-gray-100 text-gray-700" },
  proof_submitted: { label: "Comprobante enviado", className: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rechazado", className: "bg-red-100 text-red-700" },
  pending: { label: "Solicitud recibida", className: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Cita confirmada", className: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En atención", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Finalizada", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-700" },
};

const FILTERS: { value: string; label: string; keys: string[] }[] = [
  { value: "", label: "Todas", keys: [] },
  { value: "review", label: "Por revisar", keys: ["unpaid", "proof_submitted"] },
  { value: "rejected", label: "Rechazadas", keys: ["rejected"] },
  { value: "confirmed", label: "Confirmadas", keys: ["confirmed"] },
  { value: "completed", label: "Finalizadas", keys: ["completed"] },
  { value: "cancelled", label: "Canceladas", keys: ["cancelled"] },
];


function primaryStatus(a: AdminAppointment): { meta: { label: string; className: string } } {
  const key = displayKey(a);
  return { meta: STATE_META[key] ?? { label: key, className: "bg-gray-100 text-gray-700" } };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentsPage() {
  const [rows, setRows] = useState<AdminAppointment[]>([]);
  const [filterValue, setFilterValue] = useState("");
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<{
    url: string;
    title: string;
    subtitle: string;
  } | null>(null);

  const load = useCallback(() => {
    adminApi
      .appointments("all")
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

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

  useEffect(() => {
    adminApi.settings().then((s) => setSubdomain(s.subdomain ?? null)).catch(() => {});
  }, []);

  // Orden fijo por fecha de la cita: aprobar/rechazar/finalizar nunca mueve la fila de lugar.
  // Para ver rápido lo que necesita atención, usar la pestaña "Por revisar".
  const visibleRows = useMemo(() => {
    const active = FILTERS.find((f) => f.value === filterValue);
    if (!active || active.keys.length === 0) return rows;
    return rows.filter((a) => active.keys.includes(displayKey(a)));
  }, [rows, filterValue]);

  async function changeStatus(id: string, next: string) {
    setBusyId(id);
    try {
      await adminApi.updateAppointmentStatus(id, next);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function approvePayment(id: string) {
    setBusyId(id);
    try {
      await adminApi.approveAppointmentPayment(id);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo aprobar el adelanto.");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectPayment(id: string) {
    setBusyId(id);
    try {
      await adminApi.rejectAppointmentPayment(id, "");
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo rechazar el adelanto.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Operaciones</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Citas y reservas</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Flujo de servicios: solicitud recibida, cita confirmada, en atención y finalizada.
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterValue(f.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
              filterValue === f.value
                ? "bg-violet-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-black/10"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setAgendaOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
        >
          📅 Ver agenda
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {loading ? (
          <ul className="divide-y divide-black/5">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="flex items-center justify-between px-4 py-3.5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-7 w-20 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : visibleRows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay citas aquí.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Servicio</th>
                  <th className="p-4">Fecha de la cita</th>
                  <th className="p-4">Adelanto</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleRows.map((appointment) => {
                  const { meta } = primaryStatus(appointment);
                  const phone = appointment.customerPhone.replace(/\D/g, "");
                  const hasAdvance = appointment.paymentMode === "advance";
                  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(
                    `Hola ${appointment.customerName}, sobre tu reserva de ${appointment.serviceName}:`,
                  )}`;

                  return (
                    <tr key={appointment.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-950">{appointment.customerName}</p>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-green-600 hover:underline">
                          {appointment.customerPhone}
                        </a>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{appointment.serviceName}</p>
                        {appointment.note && <p className="text-xs italic text-slate-500">“{appointment.note}”</p>}
                      </td>
                      <td className="p-4 text-slate-600">{fmt(appointment.preferredAt)}</td>
                      <td className="p-4">
                        {hasAdvance ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-slate-800">S/ {Number(appointment.advanceAmount ?? 0).toFixed(2)}</span>
                            {appointment.detectedMethod && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold capitalize text-violet-700">
                                {appointment.detectedMethod}
                              </span>
                            )}
                            {appointment.operationNumber && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                                N° op. {appointment.operationNumber}
                              </span>
                            )}
                            {appointment.proofUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setProofPreview({
                                    url: appointment.proofUrl!,
                                    title: "Comprobante de adelanto",
                                    subtitle: `${appointment.serviceName} · ${appointment.customerName}`,
                                  })
                                }
                                className="text-[11px] font-bold text-violet-600 hover:underline"
                              >
                                Ver comprobante →
                              </button>
                            )}
                          </div>
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
                          {appointment.paymentStatus === "proof_submitted" && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === appointment.id}
                                onClick={() => approvePayment(appointment.id)}
                                className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Aprobar adelanto
                              </button>
                              <button
                                type="button"
                                disabled={busyId === appointment.id}
                                onClick={() => rejectPayment(appointment.id)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          {appointment.paymentStatus === "approved" && subdomain && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReceiptId(appointment.id)}
                                className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100"
                              >
                                🧾
                              </button>
                              <a
                                href={`https://wa.me/${phone}?text=${encodeURIComponent(
                                  `Hola ${appointment.customerName}, aquí tienes tu comprobante de adelanto: ${window.location.origin}${
                                    appointment.publicCode
                                      ? `/r/cita/${appointment.publicCode}`
                                      : `/tienda/${subdomain}/cita/${appointment.id}/recibo`
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
                          {appointment.status === "pending" && appointment.paymentStatus !== "proof_submitted" && (
                            <button
                              disabled={busyId === appointment.id}
                              onClick={() => changeStatus(appointment.id, "confirmed")}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                          )}
                          {(appointment.status === "confirmed" || appointment.status === "in_progress") && (
                            <button
                              disabled={busyId === appointment.id}
                              onClick={() => changeStatus(appointment.id, "completed")}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Finalizar
                            </button>
                          )}
                          {(appointment.status === "pending" || appointment.status === "confirmed" || appointment.status === "in_progress") && (
                            <button
                              type="button"
                              disabled={busyId === appointment.id}
                              onClick={() => changeStatus(appointment.id, "cancelled")}
                              title="Cancelar cita"
                              className="rounded-full px-1.5 py-1 text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              ✕
                            </button>
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

      {proofPreview && (
        <Overlay onClose={() => setProofPreview(null)} size="wide">
          <div className="mb-4 flex items-start justify-between gap-4 pr-10">
            <div>
              <p className="text-sm font-bold text-violet-700">Pago Yape</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {proofPreview.title}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {proofPreview.subtitle}
              </p>
            </div>
            <a
              href={proofPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 sm:inline-flex"
            >
              Abrir original ↗
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofPreview.url}
              alt="Comprobante de pago"
              className="max-h-[68dvh] w-full object-contain"
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <a
              href={proofPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-700"
            >
              Abrir imagen completa
            </a>
            <button
              onClick={() => setProofPreview(null)}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Cerrar
            </button>
          </div>
        </Overlay>
      )}

      {receiptId && subdomain && (
        <AppointmentReceiptModal
          subdomain={subdomain}
          id={receiptId}
          onClose={() => setReceiptId(null)}
        />
      )}

      {agendaOpen && <AgendaModal rows={rows} onClose={() => setAgendaOpen(false)} />}
    </div>
  );
}

function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("en-CA");
}

/** Formato compacto "08:00 am" (sin puntos) para que la columna Hora no se desborde. */
function formatHora(value: string | Date): string {
  const d = new Date(value);
  const hours24 = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours24 < 12 ? "am" : "pm";
  const hours12 = (hours24 % 12 || 12).toString().padStart(2, "0");
  return `${hours12}:${minutes} ${suffix}`;
}

/** Agenda del día: las citas de una fecha puntual, ordenadas por hora. */
function AgendaModal({ rows, onClose }: { rows: AdminAppointment[]; onClose: () => void }) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));

  const dayRows = useMemo(
    () =>
      rows
        .filter((a) => new Date(a.preferredAt).toLocaleDateString("en-CA") === date)
        .sort((a, b) => new Date(a.preferredAt).getTime() - new Date(b.preferredAt).getTime()),
    [rows, date],
  );

  const prettyDate = new Date(`${date}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Overlay onClose={onClose} size="wide">
      <h2 className="mb-4 text-xl font-black text-slate-950">📅 Agenda del día</h2>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDate((d) => shiftDay(d, -1))}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          aria-label="Día anterior"
        >
          ←
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-violet-500"
        />
        <button
          onClick={() => setDate((d) => shiftDay(d, 1))}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          aria-label="Día siguiente"
        >
          →
        </button>
        <button
          onClick={() => setDate(new Date().toLocaleDateString("en-CA"))}
          className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
        >
          Hoy
        </button>
        <span className="text-sm font-semibold capitalize text-slate-500">{prettyDate}</span>
      </div>

      {dayRows.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
          No hay citas para este día.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)_168px] gap-4 bg-slate-50 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
            <span>Cliente</span>
            <span>Hora</span>
            <span>Servicio</span>
            <span>Estado</span>
          </div>
          <ul className="divide-y divide-slate-200">
            {dayRows.map((a) => {
              const { meta } = primaryStatus(a);
              return (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)_168px] items-center gap-4 p-4">
                  <span className="font-bold text-slate-950">{a.customerName}</span>
                  <span className="whitespace-nowrap font-mono text-sm font-bold text-slate-800">
                    {formatHora(a.preferredAt)}
                  </span>
                  <span className="text-sm text-slate-600">{a.serviceName}</span>
                  <span className={`justify-self-start rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Overlay>
  );
}
