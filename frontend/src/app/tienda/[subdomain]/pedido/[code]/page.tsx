"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { storefrontApi, type OrderView } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { StoreBrand } from "@/lib/types";

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pendiente de pago",
  proof_submitted: "Comprobante enviado — en revisión",
  approved: "Pago aprobado ✅",
  rejected: "Pago rechazado",
};

export default function OrderPage() {
  const { subdomain, code } = useParams<{ subdomain: string; code: string }>();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [store, setStore] = useState<StoreBrand | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      storefrontApi.getOrder(subdomain, code),
      storefrontApi.getStore(subdomain),
    ])
      .then(([o, s]) => {
        setOrder(o);
        setStore(s.store);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [subdomain, code]);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const updated = await storefrontApi.submitProof(subdomain, code, file);
      setOrder(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  }

  if (error)
    return <Centered>{error}</Centered>;
  if (!order || !store) return <Centered>Cargando...</Centered>;

  const currency = order.currency;
  const waMessage = buildWhatsappMessage(order, store.name);
  const waLink = store.whatsappNumber
    ? `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`
    : null;

  return (
    <div className="min-h-full flex-1 bg-gray-50 pb-10">
      <header className="bg-green-600 px-4 py-6 text-center text-white">
        <p className="text-4xl">✅</p>
        <h1 className="mt-1 text-xl font-bold">¡Pedido creado!</h1>
        <p className="text-sm text-white/90">Código: {order.code}</p>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {/* Estado */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-sm text-gray-500">Estado del pago</p>
          <p className="text-lg font-bold text-gray-800">
            {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </p>
        </div>

        {/* Resumen del pedido */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <h2 className="mb-2 font-bold">Tu pedido</h2>
          <ul className="space-y-1 text-sm">
            {order.items.map((it, idx) => (
              <li key={idx} className="flex justify-between">
                <span>
                  {it.quantity}× {it.name}
                </span>
                <span>{formatPrice(it.lineTotal, currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t pt-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatPrice(order.deliveryFee, currency)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(order.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Pago con Yape */}
        {order.paymentStatus !== "approved" && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <h2 className="mb-2 font-bold text-violet-700">💜 Paga con Yape</h2>
            {store.yapeQrUrl ? (
              <div className="relative mx-auto h-52 w-52">
                <Image
                  src={store.yapeQrUrl}
                  alt="QR Yape"
                  fill
                  sizes="208px"
                  className="object-contain"
                />
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                El negocio aún no cargó su QR de Yape. Coordina el pago por
                WhatsApp.
              </p>
            )}
            <div className="mt-3 space-y-1 text-center text-sm">
              {store.yapeHolderName && (
                <p>
                  Titular: <b>{store.yapeHolderName}</b>
                </p>
              )}
              {store.yapeNumber && (
                <p>
                  Número Yape: <b>{store.yapeNumber}</b>
                </p>
              )}
              <p className="text-lg">
                Monto exacto:{" "}
                <b className="text-violet-700">
                  {formatPrice(order.total, currency)}
                </b>
              </p>
            </div>

            {/* Subir comprobante */}
            <div className="mt-4 border-t pt-4">
              {order.proofUrl ? (
                <p className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
                  ✅ Comprobante enviado. El negocio validará tu pago pronto.
                </p>
              ) : (
                <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-4 text-center">
                  <span className="text-sm font-semibold text-violet-700">
                    {uploading
                      ? "Subiendo..."
                      : "📸 Subir captura del pago Yape"}
                  </span>
                  <span className="mt-1 text-xs text-gray-500">
                    JPG o PNG, máx. 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp */}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-full bg-green-500 py-3 text-center font-bold text-white hover:bg-green-600"
          >
            💬 Enviar pedido por WhatsApp
          </a>
        )}

        <Link
          href={`/tienda/${subdomain}`}
          className="block text-center text-sm text-gray-500 underline"
        >
          Seguir comprando
        </Link>
      </main>
    </div>
  );
}

function buildWhatsappMessage(order: OrderView, storeName: string): string {
  const lines = [
    `*Pedido ${order.code}* — ${storeName}`,
    `Cliente: ${order.customerName} (${order.customerPhone})`,
    `Entrega: ${order.deliveryMethod === "delivery" ? "Delivery" : "Recojo en tienda"}`,
  ];
  if (order.deliveryMethod === "delivery" && order.address) {
    lines.push(`Dirección: ${order.address}${order.reference ? ` (${order.reference})` : ""}`);
  }
  lines.push("--------------------");
  for (const it of order.items) {
    lines.push(`• ${it.quantity}x ${it.name} — ${order.currency} ${it.lineTotal}`);
  }
  lines.push("--------------------");
  lines.push(`Subtotal: ${order.currency} ${order.subtotal}`);
  lines.push(`Delivery: ${order.currency} ${order.deliveryFee}`);
  lines.push(`*Total: ${order.currency} ${order.total}*`);
  if (order.customerNote) lines.push(`Nota: ${order.customerNote}`);
  return lines.join("\n");
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-20 text-gray-500">
      {children}
    </div>
  );
}
