"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { adminApi, type AdminOrderDetail } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

const NEXT: Record<string, { value: string; label: string }[]> = {
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

  return (
    <Overlay onClose={onClose}>
      {!order ? (
        <p className="p-8 text-center text-slate-500">{error || "Cargando..."}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 pr-9">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-950">{order.publicCode}</h2>
              <p className="text-sm text-slate-500">
                {new Date(order.createdAt).toLocaleString("es-PE")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} type="payment" />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>
          )}

          <Card title="Cliente">
            <p className="font-semibold text-slate-900">{order.customerName}</p>
            <p className="text-sm text-slate-600">{order.customerPhone}</p>
            <p className="mt-1 text-sm text-slate-700">
              {order.deliveryMethod === "delivery"
                ? `🚚 Delivery: ${order.address ?? ""}${order.reference ? ` (${order.reference})` : ""}`
                : "🏪 Recojo en tienda"}
            </p>
            {order.customerNote && (
              <p className="mt-1 text-sm text-slate-500">Nota: {order.customerNote}</p>
            )}
          </Card>

          <Card title="Productos">
            <ul className="space-y-1 text-sm text-slate-800">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>{it.quantity}× {it.name}</span>
                  <span>{formatPrice(it.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-sm text-slate-600">
              <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
              <Row label="Delivery" value={formatPrice(order.deliveryFee, order.currency)} />
              <div className="flex justify-between text-base font-black text-slate-950">
                <span>Total</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </Card>

          <Card title="Pago (Yape)">
            {order.payment?.proofUrl ? (
              <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Image src={order.payment.proofUrl} alt="Comprobante" width={200} height={260} className="rounded-lg ring-1 ring-slate-200" />
                <span className="text-xs text-violet-600">Ver comprobante completo</span>
              </a>
            ) : (
              <p className="text-sm text-slate-400">El cliente aún no subió comprobante.</p>
            )}
            {order.payment?.rejectionComment && (
              <p className="mt-2 text-sm text-red-600">Rechazo: {order.payment.rejectionComment}</p>
            )}
            {canValidatePayment && (
              <div className="mt-3 flex gap-2">
                <button disabled={busy} onClick={() => run(() => adminApi.approvePayment(order.id))}
                  className="flex-1 rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                  ✅ Aprobar pago
                </button>
                <button disabled={busy} onClick={() => { const c = prompt("Motivo del rechazo (opcional):") ?? ""; run(() => adminApi.rejectPayment(order.id, c)); }}
                  className="flex-1 rounded-lg bg-red-100 py-2 font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60">
                  ✗ Rechazar
                </button>
              </div>
            )}
          </Card>

          {(NEXT[order.status]?.length ?? 0) > 0 && (
            <Card title="Cambiar estado">
              <div className="flex flex-wrap gap-2">
                {NEXT[order.status].map((t) => (
                  <button key={t.value} disabled={busy} onClick={() => run(() => adminApi.changeStatus(order.id, t.value))}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                    {t.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card title="Historial">
            <ul className="space-y-1 text-sm text-slate-600">
              {order.history.map((h, i) => (
                <li key={i}>
                  <span className="text-slate-400">
                    {new Date(h.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>{" "}
                  — {h.fromStatus ? `${h.fromStatus} → ` : ""}<b>{h.toStatus}</b>
                  {h.comment ? ` (${h.comment})` : ""}
                </li>
              ))}
            </ul>
          </Card>
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
  size?: "default" | "wide";
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${
          size === "wide" ? "sm:max-w-5xl sm:p-6" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          aria-label="Cerrar"
        >
          ✕
        </button>
        {children}
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
