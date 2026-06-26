"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { adminApi, type AdminOrderDetail } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge, orderStatusMeta, type OrderStatusContext } from "@/components/StatusBadge";
import { archetypeOf, resolveCategory } from "@/lib/business-categories";

const NEXT_PHYSICAL: Record<string, { value: string; label: string }[]> = {
  pending: [{ value: "cancelled", label: "Cancelar" }],
  confirmed: [
    { value: "preparing", label: "Preparar" },
    { value: "cancelled", label: "Cancelar" },
  ],
  preparing: [
    { value: "out_for_delivery", label: "Enviar" },
    { value: "delivered", label: "Entregado" },
  ],
  out_for_delivery: [{ value: "delivered", label: "Entregado" }],
};

function orderContext(order: AdminOrderDetail): {
  isServiceLike: boolean;
  isTelecom: boolean;
  statusContext: OrderStatusContext;
} {
  const category = resolveCategory(order.businessType);
  const archetype = archetypeOf(category);
  const isServiceLike = archetype === "digital" || archetype === "servicios";
  const isTelecom = category.id === "telecomunicaciones";

  return {
    isServiceLike,
    isTelecom,
    statusContext: isTelecom ? "telecom" : isServiceLike ? "service" : "physical",
  };
}

function nextForOrder(order: AdminOrderDetail) {
  const context = orderContext(order);
  if (!context.isServiceLike) return NEXT_PHYSICAL[order.status] ?? [];

  const doneLabel = context.isTelecom ? "Marcar activado" : "Marcar completado";
  const map: Record<string, { value: string; label: string }[]> = {
    pending: [{ value: "cancelled", label: "Cancelar" }],
    confirmed: [
      { value: "delivered", label: doneLabel },
      { value: "cancelled", label: "Cancelar" },
    ],
    preparing: [{ value: "delivered", label: doneLabel }],
    out_for_delivery: [{ value: "delivered", label: doneLabel }],
  };

  return map[order.status] ?? [];
}

function statusMeta(order: AdminOrderDetail, status = order.status) {
  return orderStatusMeta(status, orderContext(order).statusContext);
}

function OrderStatusBadge({ order }: { order: AdminOrderDetail }) {
  const status = statusMeta(order);
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
      {status.label}
    </span>
  );
}

export function OrderDetailModal({
  orderId,
  onClose,
  onChanged,
}: {
  orderId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi
      .order(orderId)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [orderId]);

  async function run(fn: () => Promise<AdminOrderDetail>) {
    setBusy(true);
    setError("");
    try {
      setOrder(await fn());
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const canValidatePayment =
    order?.payment &&
    ["proof_submitted", "pending", "rejected"].includes(order.payment.status);
  const context = order ? orderContext(order) : null;
  const nextTransitions = order ? nextForOrder(order) : [];

  return (
    <Overlay onClose={onClose} size="medium">
      {!order || !context ? (
        <p className="p-8 text-center text-slate-500">{error || "Cargando..."}</p>
      ) : (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-1 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 pb-3 pt-5 pr-14 backdrop-blur">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-950">{order.publicCode}</h2>
              <p className="text-sm text-slate-500">
                {new Date(order.createdAt).toLocaleString("es-PE")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <OrderStatusBadge order={order} />
              <StatusBadge status={order.paymentStatus} type="payment" />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <div className="space-y-4">
              <Card title="Cliente">
                <p className="font-semibold text-slate-900">{order.customerName}</p>
                <p className="text-sm text-slate-600">{order.customerPhone}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {context.isServiceLike
                    ? context.isTelecom
                      ? "Activación/instalación coordinada"
                      : "Atención de servicio coordinada"
                    : order.deliveryMethod === "delivery"
                      ? `Entrega a domicilio: ${order.address ?? ""}${order.reference ? ` (${order.reference})` : ""}`
                      : "Recojo en tienda"}
                </p>
                {order.customerNote && (
                  <p className="mt-1 text-sm text-slate-500">Nota: {order.customerNote}</p>
                )}
              </Card>

              <Card title={context.isTelecom ? "Plan contratado" : context.isServiceLike ? "Servicio solicitado" : "Productos"}>
                <ul className="space-y-1 text-sm text-slate-800">
                  {order.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {it.quantity}× {it.name}
                      </span>
                      <span className="shrink-0">{formatPrice(it.lineTotal, order.currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-sm text-slate-600">
                  <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
                  {!context.isServiceLike && (
                    <Row label="Costo de entrega" value={formatPrice(order.deliveryFee, order.currency)} />
                  )}
                  <div className="flex justify-between text-base font-black text-slate-950">
                    <span>Total</span>
                    <span>{formatPrice(order.total, order.currency)}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card title="Pago (Yape)">
                {order.payment?.proofUrl ? (
                  <a
                    href={order.payment.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-col"
                  >
                    <Image
                      src={order.payment.proofUrl}
                      alt="Comprobante"
                      width={120}
                      height={150}
                      className="h-32 w-auto rounded-lg object-cover ring-1 ring-slate-200"
                    />
                    <span className="mt-1 text-xs font-semibold text-violet-600">
                      Ver comprobante completo →
                    </span>
                  </a>
                ) : (
                  <p className="text-sm text-slate-400">El cliente aún no subió comprobante.</p>
                )}
                {order.payment?.rejectionComment && (
                  <p className="mt-2 text-sm text-red-600">Rechazo: {order.payment.rejectionComment}</p>
                )}
                {canValidatePayment && (
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => run(() => adminApi.approvePayment(order.id))}
                      className="flex-1 rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      Aprobar pago
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const comment = prompt("Motivo del rechazo (opcional):") ?? "";
                        run(() => adminApi.rejectPayment(order.id, comment));
                      }}
                      className="flex-1 rounded-lg bg-red-100 py-2 font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </Card>

              {nextTransitions.length > 0 && (
                <Card title={context.isServiceLike ? "Gestionar servicio" : "Cambiar estado"}>
                  <div className="flex flex-wrap gap-2">
                    {nextTransitions.map((t) => (
                      <button
                        key={t.value}
                        disabled={busy}
                        onClick={() => run(() => adminApi.changeStatus(order.id, t.value))}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              <Card title="Historial">
                <ol className="space-y-3">
                  {order.history.map((h, i) => {
                    const last = i === order.history.length - 1;
                    return (
                      <li key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${last ? "bg-violet-600" : "bg-slate-300"}`} />
                          {!last && <span className="mt-0.5 w-px flex-1 bg-slate-200" />}
                        </div>
                        <div className="-mt-0.5 pb-0.5">
                          <p className="text-sm font-bold text-slate-900">
                            {statusMeta(order, h.toStatus).label}
                            {h.comment ? <span className="font-medium text-slate-500"> · {h.comment}</span> : ""}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(h.createdAt).toLocaleString("es-PE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}

/** Contenedor modal genérico (fondo oscuro + tarjeta scrollable). */
export function Overlay({
  children,
  onClose,
  size = "default",
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "medium" | "wide";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          size === "wide" ? "sm:max-w-5xl" : size === "medium" ? "sm:max-w-3xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-200"
          aria-label="Cerrar"
        >
          ×
        </button>
        <div className={`overflow-y-auto ${size === "wide" ? "p-5 sm:p-6" : "p-5"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <h3 className="mb-2 font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
