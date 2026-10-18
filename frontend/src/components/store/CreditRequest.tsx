"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { storefrontApi } from "@/lib/api";
import { usesCredits } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

type CreditStore = { name: string; whatsapp: string } | null;

/**
 * La página de la tienda ya trae sus datos: los pasa por aquí para que el botón
 * salga al instante, sin volver a consultar la tienda cada vez que se abre un producto.
 * Sin proveedor (undefined), el botón consulta la tienda por su cuenta.
 */
const CreditStoreContext = createContext<CreditStore | undefined>(undefined);

export function CreditStoreProvider({ value, children }: { value: CreditStore; children: React.ReactNode }) {
  return <CreditStoreContext.Provider value={value}>{children}</CreditStoreContext.Provider>;
}

/**
 * "Comprar al crédito": solo en tiendas cuyo rubro usa créditos y cuya dueña lo
 * activó en Créditos. El cliente deja
 * sus datos y se abren por WhatsApp a la tienda, que lo registra en Créditos
 * (con el DNI se autocompletan sus nombres) y coordina la entrega.
 */
export function CreditRequest({
  product,
  subdomain,
  currency,
  accent,
}: {
  product: PublicProduct;
  subdomain: string;
  currency: string;
  accent: string;
}) {
  const known = useContext(CreditStoreContext);
  const [fetched, setFetched] = useState<CreditStore>(null);
  const [open, setOpen] = useState(false);
  const store = known === undefined ? fetched : known;

  useEffect(() => {
    if (known !== undefined) return;
    let alive = true;
    storefrontApi
      .getStore(subdomain)
      .then(({ store: s }) => {
        if (alive && s.creditRequests && usesCredits(s.businessType) && s.whatsappNumber) {
          setFetched({ name: s.name, whatsapp: s.whatsappNumber.replace(/\D/g, "") });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [known, subdomain]);

  if (!store || !product.inStock) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 bg-white py-3 text-sm font-black transition hover:bg-slate-50"
        style={{ color: accent, borderColor: accent }}
      >
        🤝 Comprar al crédito
      </button>
      {open && (
        <CreditForm
          product={product}
          currency={currency}
          accent={accent}
          storeName={store.name}
          whatsapp={store.whatsapp}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CreditForm({
  product,
  currency,
  accent,
  storeName,
  whatsapp,
  onClose,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  storeName: string;
  whatsapp: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", dni: "", phone: "", address: "", reference: "", birthday: "" });
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 3) return setError("Escribe tu nombre completo.");
    if (!/^\d{8}$/.test(form.dni)) return setError("El DNI debe tener 8 dígitos.");
    if (!/^9\d{8}$/.test(form.phone)) return setError("El celular debe tener 9 dígitos y empezar con 9.");
    if (form.address.trim().length < 5) return setError("Escribe tu dirección.");
    const birthday = form.birthday
      ? new Date(`${form.birthday}T12:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
      : "";
    const lines = [
      `Hola ${storeName}, quiero comprar al crédito 🤝`,
      "",
      `*Producto:* ${product.name} (${formatPrice(product.price, currency)})`,
      "",
      "*Mis datos:*",
      `• Nombre: ${form.name.trim()}`,
      `• DNI: ${form.dni}`,
      `• Celular: ${form.phone}`,
      `• Dirección: ${form.address.trim()}`,
      ...(form.reference.trim() ? [`• Referencia: ${form.reference.trim()}`] : []),
      ...(birthday ? [`• Cumpleaños: ${birthday}`] : []),
      "",
      "¿Me ayudan a registrarme y coordinar la entrega?",
    ];
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
    onClose();
  }

  const input =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500";
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="credit-form-title">
      <form onSubmit={send} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="credit-form-title" className="text-xl font-black text-slate-950">🤝 Comprar al crédito</h3>
            <p className="mt-1 text-sm text-slate-500">
              {product.name} · <b style={{ color: accent }}>{formatPrice(product.price, currency)}</b>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-600">
          Envía tus datos por WhatsApp. La tienda te registra, te confirma el crédito y coordina la entrega.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-slate-700">Nombre completo *</span>
            <input className={input} value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Ej: María Pérez Gómez" autoComplete="name" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">DNI *</span>
            <input className={input} value={form.dni} onChange={(e) => set("dni")(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder="8 dígitos" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">Celular *</span>
            <div className="flex">
              <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-500">+51</span>
              <input className={`${input} rounded-l-none`} value={form.phone} onChange={(e) => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" placeholder="987654321" />
            </div>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-slate-700">Dirección *</span>
            <input className={input} value={form.address} onChange={(e) => set("address")(e.target.value)} placeholder="Calle, número, distrito" autoComplete="street-address" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">Referencia</span>
            <input className={input} value={form.reference} onChange={(e) => set("reference")(e.target.value)} placeholder="Ej: frente al parque" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-700">Fecha de cumpleaños</span>
            <input className={input} type="date" value={form.birthday} onChange={(e) => set("birthday")(e.target.value)} />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}

        <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3 text-sm font-black text-white hover:bg-green-700">
          Enviar por WhatsApp
        </button>
      </form>
    </div>
  );
}
