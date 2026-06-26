"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { storefrontApi } from "@/lib/api";
import { storeAccent } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";
import type { StoreBrand } from "@/lib/types";

export default function CheckoutPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [store, setStore] = useState<StoreBrand | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Una sola clave de idempotencia por intento de compra.
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

  const deliveryFee = useMemo(
    () => (method === "delivery" ? Number(store?.deliveryFee ?? 0) : 0),
    [method, store],
  );
  const total = subtotal + deliveryFee;
  const currency = store?.currency ?? "PEN";
  const accent = store ? storeAccent(store) : "#0f172a";

  async function submit() {
    setError("");
    if (!name.trim() || phone.trim().length < 6) {
      setError("Ingresa tu nombre y un teléfono válido.");
      return;
    }
    if (method === "delivery" && !address.trim()) {
      setError("La dirección es obligatoria para delivery.");
      return;
    }
    if (method === "delivery" && store?.minOrder && subtotal < Number(store.minOrder)) {
      setError(`El pedido mínimo para entrega a domicilio es ${formatPrice(store.minOrder, currency)}.`);
      return;
    }
    setSaving(true);
    try {
      idemKey.current ??= crypto.randomUUID();
      const order = await storefrontApi.checkout(
        subdomain,
        {
          customerName: name,
          customerPhone: phone,
          deliveryMethod: method,
          address: method === "delivery" ? address : undefined,
          reference: reference || undefined,
          customerNote: note || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
        idemKey.current,
      );
      clear();
      router.push(`/tienda/${subdomain}/pedido/${order.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el pedido.");
      setSaving(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 bg-gray-50 py-20 text-center">
        <p className="text-gray-500">Tu carrito está vacío.</p>
        <Link
          href={`/tienda/${subdomain}`}
          style={{ backgroundColor: accent }}
          className="mt-4 inline-block rounded-full px-5 py-2 font-semibold text-white"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full flex-1 bg-gray-50 pb-10">
      <header style={{ backgroundColor: accent }} className="px-4 py-4 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={`/tienda/${subdomain}/carrito`} className="text-2xl">
            ←
          </Link>
          <h1 className="text-lg font-bold">Tus datos</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <Field label="Nombre completo *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Ej: María Pérez"
          />
        </Field>
        <Field label="Teléfono / WhatsApp *">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="input"
            placeholder="Ej: 987 654 321"
          />
        </Field>

        {/* Método de entrega */}
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">
            ¿Cómo quieres recibirlo?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {store?.allowsPickup && (
              <MethodBtn
                active={method === "pickup"}
                onClick={() => setMethod("pickup")}
                title="🏪 Recojo"
                sub="En la tienda"
                accent={accent}
              />
            )}
            {store?.allowsDelivery && (
              <MethodBtn
                active={method === "delivery"}
                onClick={() => setMethod("delivery")}
                title="🚚 Entrega a domicilio"
                sub={
                  deliveryFee > 0
                    ? formatPrice(store.deliveryFee, currency)
                    : "A domicilio"
                }
                accent={accent}
              />
            )}
          </div>
        </div>

        {method === "delivery" && (
          <>
            <Field label="Dirección *">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input"
                placeholder="Calle, número, distrito"
              />
            </Field>
            <Field label="Referencia (opcional)">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="input"
                placeholder="Ej: frente al parque"
              />
            </Field>
          </>
        )}

        <Field label="Nota para el negocio (opcional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            rows={2}
          />
        </Field>

        {/* Resumen */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <Row label="Subtotal" value={formatPrice(subtotal, currency)} />
          <Row label="Costo de entrega" value={formatPrice(deliveryFee, currency)} />
          <div className="mt-2 flex justify-between border-t pt-2 text-lg font-extrabold">
            <span>Total</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={saving}
          style={{ backgroundColor: accent }}
          className="w-full rounded-full py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Creando pedido..." : "Confirmar pedido →"}
        </button>
      </main>

      <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid #e5e7eb;padding:0.6rem 0.75rem;font-size:0.95rem;outline:none}.input:focus{border-color:#94a3b8}`}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
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
      style={
        active
          ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}`, backgroundColor: `${accent}14` }
          : undefined
      }
      className={`rounded-xl border p-3 text-left transition ${
        active ? "" : "border-gray-200 bg-white"
      }`}
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
