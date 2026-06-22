"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminApi, type AdminOrderDetail } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

// Transiciones válidas (espejo del backend) para mostrar botones.
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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    adminApi
      .order(id)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }
  useEffect(load, [id]);

  async function run(fn: () => Promise<AdminOrderDetail>) {
    setBusy(true);
    setError("");
    try {
      setOrder(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <p className="text-red-600">{error}</p>;
  if (!order) return <p className="text-gray-400">Cargando...</p>;

  const canValidatePayment =
    order.payment &&
    (order.payment.status === "proof_submitted" ||
      order.payment.status === "pending" ||
      order.payment.status === "rejected");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/panel/pedidos" className="text-sm text-violet-600">
        ← Volver a pedidos
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{order.publicCode}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString("es-PE")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} type="payment" />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}

      {/* Cliente */}
      <Card title="Cliente">
        <p className="font-medium">{order.customerName}</p>
        <p className="text-sm text-gray-600">{order.customerPhone}</p>
        <p className="mt-1 text-sm">
          {order.deliveryMethod === "delivery"
            ? `🚚 Delivery: ${order.address ?? ""}${order.reference ? ` (${order.reference})` : ""}`
            : "🏪 Recojo en tienda"}
        </p>
        {order.customerNote && (
          <p className="mt-1 text-sm text-gray-500">Nota: {order.customerNote}</p>
        )}
      </Card>

      {/* Items */}
      <Card title="Productos">
        <ul className="space-y-1 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {it.quantity}× {it.name}
              </span>
              <span>{formatPrice(it.lineTotal, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 space-y-1 border-t pt-2 text-sm">
          <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
          <Row label="Delivery" value={formatPrice(order.deliveryFee, order.currency)} />
          <div className="flex justify-between text-base font-extrabold">
            <span>Total</span>
            <span>{formatPrice(order.total, order.currency)}</span>
          </div>
        </div>
      </Card>

      {/* Pago */}
      <Card title="Pago (Yape)">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.paymentStatus} type="payment" />
          <span className="text-sm text-gray-500">
            Esperado: {formatPrice(order.payment?.expectedAmount ?? "0", order.currency)}
          </span>
        </div>
        {order.payment?.proofUrl ? (
          <a
            href={order.payment.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block"
          >
            <Image
              src={order.payment.proofUrl}
              alt="Comprobante"
              width={220}
              height={300}
              className="rounded-lg ring-1 ring-black/10"
            />
            <span className="text-xs text-violet-600">Ver comprobante completo</span>
          </a>
        ) : (
          <p className="mt-2 text-sm text-gray-400">
            El cliente aún no subió comprobante.
          </p>
        )}
        {order.payment?.rejectionComment && (
          <p className="mt-2 text-sm text-red-600">
            Rechazo: {order.payment.rejectionComment}
          </p>
        )}

        {canValidatePayment && (
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => adminApi.approvePayment(order.id))}
              className="flex-1 rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              ✅ Aprobar pago
            </button>
            <button
              disabled={busy}
              onClick={() => {
                const c = prompt("Motivo del rechazo (opcional):") ?? "";
                run(() => adminApi.rejectPayment(order.id, c));
              }}
              className="flex-1 rounded-lg bg-red-100 py-2 font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
            >
              ✗ Rechazar
            </button>
          </div>
        )}
      </Card>

      {/* Estado del pedido */}
      {(NEXT[order.status]?.length ?? 0) > 0 && (
        <Card title="Cambiar estado">
          <div className="flex flex-wrap gap-2">
            {NEXT[order.status].map((t) => (
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

      {/* Historial */}
      <Card title="Historial">
        <ul className="space-y-1 text-sm text-gray-600">
          {order.history.map((h, i) => (
            <li key={i}>
              <span className="text-gray-400">
                {new Date(h.createdAt).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>{" "}
              — {h.fromStatus ? `${h.fromStatus} → ` : ""}
              <b>{h.toStatus}</b>
              {h.comment ? ` (${h.comment})` : ""}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h2 className="mb-2 font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
