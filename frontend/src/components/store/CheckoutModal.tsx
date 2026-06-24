"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { storefrontApi, type OrderView } from "@/lib/api";
import { storeAccent } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";
import type { StoreBrand } from "@/lib/types";

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pendiente de pago",
  proof_submitted: "Comprobante enviado — en revisión",
  approved: "Pago aprobado ✅",
  rejected: "Pago rechazado",
};

/** Pago en modal centrado: formulario + confirmación/Yape, todo en la misma pantalla. */
export function CheckoutModal({ subdomain, onClose }: { subdomain: string; onClose: () => void }) {
  const { items, subtotal, clear } = useCart();

  const [store, setStore] = useState<StoreBrand | null>(null);
  const [order, setOrder] = useState<OrderView | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const idemKey = useRef<string | null>(null);

  useEffect(() => {
    storefrontApi
      .getStore(subdomain)
      .then((d) => {
        setStore(d.store);
        setMethod(d.store.allowsPickup ? "pickup" : "delivery");
      })
      .catch(() => setError("No se pudo cargar la tienda."));
  }, [subdomain]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const deliveryFee = useMemo(
    () => (method === "delivery" ? Number(store?.deliveryFee ?? 0) : 0),
    [method, store],
  );
  const total = subtotal + deliveryFee;
  const currency = store?.currency ?? "PEN";
  const accent = store ? storeAccent(store) : "#0f172a";

  async function submit() {
    setError("");
    if (!name.trim()) {
      setError("Ingresa tu nombre.");
      return;
    }
    if (!/^9\d{8}$/.test(phone)) {
      setError("Ingresa un celular válido: 9 dígitos que empiezan con 9.");
      return;
    }
    if (method === "delivery" && !address.trim()) {
      setError("La dirección es obligatoria para delivery.");
      return;
    }
    if (method === "delivery" && store?.minOrder && subtotal < Number(store.minOrder)) {
      setError(`El pedido mínimo para delivery es ${formatPrice(store.minOrder, currency)}.`);
      return;
    }
    setSaving(true);
    try {
      idemKey.current ??= genIdempotencyKey();
      const created = await storefrontApi.checkout(
        subdomain,
        {
          customerName: name,
          customerPhone: phone,
          deliveryMethod: method,
          address: method === "delivery" ? address : undefined,
          reference: reference || undefined,
          customerNote: note || undefined,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
        idemKey.current,
      );
      clear();
      setOrder(created); // → muestra la confirmación en el mismo modal
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File) {
    if (!order) return;
    setUploading(true);
    setError("");
    try {
      const updated = await storefrontApi.submitProof(subdomain, order.code, file);
      setOrder(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  }

  const waLink =
    order && store?.whatsappNumber
      ? `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(buildWaMessage(order, store.name))}`
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado: cambia entre "Finalizar" y "Pedido creado" */}
        {order ? (
          <header className="relative bg-green-600 px-5 py-5 text-center text-white">
            <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
            <p className="text-3xl">✅</p>
            <h2 className="mt-1 text-lg font-black">¡Pedido creado!</h2>
            <p className="text-sm text-white/90">Código: {order.code}</p>
          </header>
        ) : (
          <header className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: accent }}>
            <h2 className="text-lg font-black">Finalizar pedido</h2>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
          </header>
        )}

        <div className="space-y-4 overflow-y-auto p-5">
          {!order ? (
            // ─────────── Vista 1: formulario (2 columnas, sin scroll) ───────────
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo *">
                <input value={name} onChange={(e) => setName(e.target.value)} className="cm-input" placeholder="Ej: María Pérez" />
              </Field>
              <Field label="Teléfono / WhatsApp *">
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" maxLength={9} className="cm-input" placeholder="Ej: 987654321" />
                {phone.length > 0 && !/^9\d{8}$/.test(phone) && (
                  <span className="mt-1 block text-xs font-medium text-amber-600">Celular de 9 dígitos que empieza con 9.</span>
                )}
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-1 text-sm font-medium text-gray-700">¿Cómo quieres recibirlo?</p>
                <div className="grid grid-cols-2 gap-2">
                  {store?.allowsPickup && (
                    <MethodBtn active={method === "pickup"} onClick={() => setMethod("pickup")} title="🏪 Recojo" sub="En la tienda" accent={accent} />
                  )}
                  {store?.allowsDelivery && (
                    <MethodBtn
                      active={method === "delivery"}
                      onClick={() => setMethod("delivery")}
                      title="🚚 Delivery"
                      sub={deliveryFee > 0 ? formatPrice(store!.deliveryFee, currency) : "A domicilio"}
                      accent={accent}
                    />
                  )}
                </div>
              </div>

              {method === "delivery" && (
                <>
                  <Field label="Dirección *">
                    <input value={address} onChange={(e) => setAddress(e.target.value)} className="cm-input" placeholder="Calle, número, distrito" />
                  </Field>
                  <Field label="Referencia (opcional)">
                    <input value={reference} onChange={(e) => setReference(e.target.value)} className="cm-input" placeholder="Ej: frente al parque" />
                  </Field>
                </>
              )}

              <Field label="Nota para el negocio (opcional)" className="sm:col-span-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="cm-input" rows={2} />
              </Field>

              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 sm:col-span-2">
                <Row label="Subtotal" value={formatPrice(subtotal, currency)} />
                <Row label="Delivery" value={formatPrice(deliveryFee, currency)} />
                <div className="mt-2 flex justify-between border-t pt-2 text-lg font-extrabold">
                  <span>Total</span>
                  <span>{formatPrice(total, currency)}</span>
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 sm:col-span-2">{error}</p>}

              <button
                onClick={submit}
                disabled={saving}
                style={{ backgroundColor: accent }}
                className="w-full rounded-full py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:col-span-2"
              >
                {saving ? "Creando pedido..." : "Confirmar pedido →"}
              </button>
            </div>
          ) : (
            // ─────────── Vista 2: confirmación + Yape (2 columnas) ───────────
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              {/* Columna izquierda: estado + resumen */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
                  <p className="text-sm text-gray-500">Estado del pago</p>
                  <p className="text-lg font-bold text-gray-800">{PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}</p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
                  <h3 className="mb-2 font-bold">Tu pedido</h3>
                  <ul className="space-y-1 text-sm">
                    {order.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.quantity}× {it.name}</span>
                        <span>{formatPrice(it.lineTotal, order.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 space-y-1 border-t pt-2 text-sm text-gray-600">
                    <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
                    <Row label="Delivery" value={formatPrice(order.deliveryFee, order.currency)} />
                    <div className="flex justify-between text-base font-extrabold text-gray-900">
                      <span>Total</span>
                      <span>{formatPrice(order.total, order.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Yape + WhatsApp */}
              <div className="space-y-4">
                {order.paymentStatus !== "approved" && (
                  order.proofUrl ? (
                    // Ya pagó: comprobante recibido (compacto, sin QR)
                    <div className="rounded-2xl bg-green-50 p-4 text-center ring-1 ring-green-200">
                      <a href={order.proofUrl} target="_blank" rel="noopener noreferrer" className="mx-auto mb-2 block w-fit">
                        <Image src={order.proofUrl} alt="Comprobante enviado" width={110} height={140} className="mx-auto h-28 w-auto rounded-lg object-cover ring-1 ring-green-300" />
                      </a>
                      <p className="text-sm font-bold text-green-800">✅ Comprobante recibido por {store?.name ?? "el negocio"}</p>
                      <p className="mt-1 text-xs text-green-700">Ya aparece en el panel del dueño, en Pedidos, para validar tu pago.</p>
                      {order.whatsappNotification?.status === "sent" && (
                        <p className="mt-2 rounded-lg bg-green-100 px-2 py-1.5 text-xs font-bold text-green-800">📲 La imagen también se envió al WhatsApp del dueño.</p>
                      )}
                      {order.whatsappNotification?.status === "failed" && (
                        <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-800">La imagen quedó guardada, pero la notificación automática de WhatsApp falló.</p>
                      )}
                    </div>
                  ) : (
                    // Aún no paga: instrucciones de Yape + subir comprobante
                    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
                      <h3 className="mb-2 font-bold text-violet-700">💜 Paga con Yape</h3>
                      {store?.yapeQrUrl ? (
                        <div className="relative mx-auto h-40 w-40">
                          <Image src={store.yapeQrUrl} alt="QR Yape" fill sizes="160px" className="object-contain" />
                        </div>
                      ) : (
                        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">El negocio aún no cargó su QR de Yape. Coordina el pago por WhatsApp.</p>
                      )}
                      <div className="mt-3 space-y-1 text-center text-sm">
                        {store?.yapeHolderName && <p>Titular: <b>{store.yapeHolderName}</b></p>}
                        {store?.yapeNumber && <p>Número Yape: <b>{store.yapeNumber}</b></p>}
                        <p className="text-base">Monto exacto: <b className="text-violet-700">{formatPrice(order.total, order.currency)}</b></p>
                      </div>
                      <div className="mt-3 border-t pt-3">
                        <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-center">
                          <span className="text-sm font-semibold text-violet-700">{uploading ? "Subiendo..." : "📸 Subir captura del pago Yape"}</span>
                          <span className="mt-1 text-xs text-gray-500">JPG o PNG, máx. 5MB</span>
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                        </label>
                      </div>
                    </div>
                  )
                )}

                {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

                {/* El WhatsApp va directo al chat del dueño (wa.me con su número),
                    con el pedido y el enlace de la foto. SOLO se muestra después de
                    subir la foto (o si el negocio no tiene Yape) para no enviarlo antes. */}
                {waLink && (order.proofUrl || !store?.yapeQrUrl) ? (
                  <>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-full bg-green-500 py-3 text-center font-bold text-white hover:bg-green-600"
                    >
                      💬 {order.proofUrl ? "Enviar comprobante al negocio" : "Avisar el pedido por WhatsApp"}
                    </a>
                    {order.proofUrl && (
                      <p className="px-2 text-center text-xs font-medium text-gray-500">
                        Se abre el chat del negocio con tu pedido y el <b>enlace de la foto</b>. La foto también quedó guardada en su panel.
                      </p>
                    )}
                  </>
                ) : (
                  order.paymentStatus !== "approved" && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      📸 Primero <b>sube tu comprobante</b> arriba; luego aparecerá el botón para avisar al negocio por WhatsApp.
                    </p>
                  )
                )}

                <button onClick={onClose} className="block w-full py-1 text-center text-sm font-semibold text-gray-500 hover:text-gray-700">
                  Seguir comprando
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`.cm-input{width:100%;border-radius:0.75rem;border:1px solid #e5e7eb;padding:0.6rem 0.75rem;font-size:0.95rem;outline:none}.cm-input:focus{border-color:#94a3b8}`}</style>
      </div>
    </div>
  );
}

/**
 * Genera una clave de idempotencia única. `crypto.randomUUID()` no existe en
 * contextos no seguros (http en el celular por IP), así que usamos un respaldo.
 */
function genIdempotencyKey(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* sigue al respaldo */
  }
  return `mt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildWaMessage(order: OrderView, storeName: string): string {
  const lines = [
    `*Pedido ${order.code}* — ${storeName}`,
    `Cliente: ${order.customerName} (${order.customerPhone})`,
    `Entrega: ${order.deliveryMethod === "delivery" ? "Delivery" : "Recojo en tienda"}`,
  ];
  if (order.deliveryMethod === "delivery" && order.address) {
    lines.push(`Dirección: ${order.address}${order.reference ? ` (${order.reference})` : ""}`);
  }
  lines.push("--------------------");
  for (const it of order.items) lines.push(`• ${it.quantity}x ${it.name} — ${order.currency} ${it.lineTotal}`);
  lines.push("--------------------");
  lines.push(`Subtotal: ${order.currency} ${order.subtotal}`);
  lines.push(`Delivery: ${order.currency} ${order.deliveryFee}`);
  lines.push(`*Total: ${order.currency} ${order.total}*`);
  if (order.customerNote) lines.push(`Nota: ${order.customerNote}`);
  if (order.proofUrl) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    lines.push("--------------------");
    lines.push("✅ *Ya pagué.* Comprobante:");
    lines.push(`${origin}/c/${order.code}`);
  }
  return lines.join("\n");
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function MethodBtn({
  active,
  onClick,
  title,
  sub,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      style={active ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}`, backgroundColor: `${accent}14` } : undefined}
      className={`rounded-xl border p-3 text-left transition ${active ? "" : "border-gray-200 bg-white"}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-gray-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
