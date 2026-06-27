"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminAppointment } from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";
import { Skeleton } from "@/components/Skeleton";

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Recibidas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "in_progress", label: "En atención" },
  { value: "completed", label: "Finalizadas" },
  { value: "cancelled", label: "Canceladas" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Solicitud recibida", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Cita confirmada", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "En atención", className: "bg-violet-100 text-violet-800" },
  completed: { label: "Finalizada", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelada", className: "bg-slate-200 text-slate-600" },
};

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Adelanto pendiente", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  proof_submitted: { label: "Comprobante enviado", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  approved: { label: "Adelanto aprobado", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Adelanto rechazado", className: "bg-red-50 text-red-700 ring-red-200" },
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
  const [proofPreview, setProofPreview] = useState<{
    url: string;
    title: string;
    subtitle: string;
  } | null>(null);

  const load = useCallback(() => {
    adminApi
      .appointments(status)
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Error"))
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Operaciones</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Citas y reservas</h1>
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
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setLoading(true);
              setStatus(filter.value);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
              status === filter.value
                ? "bg-violet-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-black/10"
            }`}
          >
            {filter.label}
          </button>
        ))}
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
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No hay citas aquí.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((appointment) => {
              const meta = STATUS_META[appointment.status] ?? {
                label: appointment.status,
                className: "bg-slate-100 text-slate-700",
              };
              const phone = appointment.customerPhone.replace(/\D/g, "");
              const hasAdvance = appointment.paymentMode === "advance";
              const paymentMeta = PAYMENT_STATUS_META[appointment.paymentStatus] ?? PAYMENT_STATUS_META.pending;
              const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(
                `Hola ${appointment.customerName}, sobre tu reserva de ${appointment.serviceName}:`,
              )}`;

              return (
                <li
                  key={appointment.id}
                  className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>
                        {meta.label}
                      </span>
                      <p className="font-bold text-slate-900">{appointment.serviceName}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      📅 {fmt(appointment.preferredAt)} · 👤 {appointment.customerName} ·{" "}
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-green-600 hover:underline"
                      >
                        {appointment.customerPhone}
                      </a>
                    </p>
                    {appointment.note && (
                      <p className="mt-0.5 text-xs italic text-slate-500">“{appointment.note}”</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                      {hasAdvance ? (
                        <>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            Adelanto: S/ {Number(appointment.advanceAmount ?? 0).toFixed(2)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 ring-1 ${paymentMeta.className}`}>
                            {paymentMeta.label}
                          </span>
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
                              className="rounded-full bg-white px-2.5 py-1 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
                            >
                              Ver comprobante →
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">
                          Reserva sin adelanto
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {appointment.status === "pending" && (
                      <>
                        <button
                          disabled={busyId === appointment.id}
                          onClick={() => changeStatus(appointment.id, "confirmed")}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Confirmar cita
                        </button>
                        <CancelButton busy={busyId === appointment.id} onClick={() => changeStatus(appointment.id, "cancelled")} />
                      </>
                    )}
                    {appointment.status === "confirmed" && (
                      <>
                        <button
                          disabled={busyId === appointment.id}
                          onClick={() => changeStatus(appointment.id, "in_progress")}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          Iniciar atención
                        </button>
                        <button
                          disabled={busyId === appointment.id}
                          onClick={() => changeStatus(appointment.id, "completed")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Finalizar
                        </button>
                        <CancelButton busy={busyId === appointment.id} onClick={() => changeStatus(appointment.id, "cancelled")} />
                      </>
                    )}
                    {appointment.status === "in_progress" && (
                      <>
                        <button
                          disabled={busyId === appointment.id}
                          onClick={() => changeStatus(appointment.id, "completed")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Finalizar
                        </button>
                        <CancelButton busy={busyId === appointment.id} onClick={() => changeStatus(appointment.id, "cancelled")} />
                      </>
                    )}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
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
    </div>
  );
}

function CancelButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
    >
      Cancelar
    </button>
  );
}
