"use client";

import { useEffect, useState } from "react";
import { storefrontApi } from "@/lib/api";

/**
 * Suscripción a un plan digital: guarda la solicitud en el sistema y, al
 * confirmar, abre WhatsApp del negocio para activar el acceso.
 */
export function SubscribeModal({
  subdomain,
  storeName,
  planName,
  productId,
  accent,
  whatsappNumber,
  actionLabel,
  onClose,
}: {
  subdomain: string;
  storeName: string;
  planName: string;
  productId?: string;
  accent: string;
  whatsappNumber: string | null;
  actionLabel: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const phoneDigits = whatsappNumber?.replace(/\D/g, "");
  const waLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Hola ${storeName}, quiero suscribirme al plan *${planName}*. Mi nombre es ${name}.`,
      )}`
    : null;

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
    setSaving(true);
    try {
      await storefrontApi.createSubscription(subdomain, {
        customerName: name,
        customerPhone: phone,
        planName,
        productId,
        note: note || undefined,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo suscribir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <header className="relative bg-green-600 px-5 py-6 text-center text-white">
              <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
              <p className="text-3xl">⭐</p>
              <h2 className="mt-1 text-lg font-black">¡Solicitud enviada!</h2>
            </header>
            <div className="space-y-4 p-5 text-center">
              <p className="text-sm text-gray-700">
                Tu suscripción al plan <b>{planName}</b> quedó registrada. El negocio la verá en su panel y activará tu acceso.
              </p>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full bg-green-500 py-3 font-bold text-white hover:bg-green-600">
                  💬 Coordinar activación por WhatsApp
                </a>
              )}
              <button onClick={onClose} className="block w-full py-1 text-sm font-semibold text-gray-500 hover:text-gray-700">Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: accent }}>
              <h2 className="text-base font-black">{actionLabel}: {planName}</h2>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
            </header>
            <div className="space-y-3 overflow-y-auto p-5">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Tu nombre *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="sub-input" placeholder="Ej: Juan Pérez" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Teléfono / WhatsApp *</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" maxLength={9} className="sub-input" placeholder="Ej: 987654321" />
                {phone.length > 0 && !/^9\d{8}$/.test(phone) && (
                  <span className="mt-1 block text-xs font-medium text-amber-600">Celular de 9 dígitos que empieza con 9.</span>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Nota (opcional)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="sub-input" rows={2} placeholder="Algún detalle para el negocio" />
              </label>
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
              <button onClick={submit} disabled={saving} style={{ backgroundColor: accent }} className="w-full rounded-full py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                {saving ? "Enviando..." : `${actionLabel} →`}
              </button>
              <p className="text-center text-xs text-gray-500">El negocio activará tu suscripción y coordinará el pago por WhatsApp.</p>
            </div>
          </>
        )}
        <style>{`.sub-input{width:100%;border-radius:0.75rem;border:1px solid #e5e7eb;padding:0.6rem 0.75rem;font-size:0.95rem;outline:none}.sub-input:focus{border-color:#94a3b8}`}</style>
      </div>
    </div>
  );
}
