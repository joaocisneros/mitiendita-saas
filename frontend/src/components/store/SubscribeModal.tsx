"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storefrontApi, type SubscriptionView } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { PayOptions } from "@/components/store/PayOptions";

/**
 * Suscripción a un plan digital: guarda la solicitud, permite pagar por Yape,
 * subir el comprobante y avisar al negocio por WhatsApp.
 */
export function SubscribeModal({
  subdomain,
  storeName,
  planName,
  productId,
  accent,
  whatsappNumber,
  actionLabel,
  price,
  currency,
  yapeQrUrl,
  yapeHolderName,
  yapeNumber,
  plinQrUrl,
  plinHolderName,
  plinNumber,
  onClose,
}: {
  subdomain: string;
  storeName: string;
  planName: string;
  productId?: string;
  accent: string;
  whatsappNumber: string | null;
  actionLabel: string;
  price?: string | number;
  currency?: string;
  yapeQrUrl?: string | null;
  yapeHolderName?: string | null;
  yapeNumber?: string | null;
  plinQrUrl?: string | null;
  plinHolderName?: string | null;
  plinNumber?: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofError, setProofError] = useState("");

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
  const amountLabel = price != null && Number(price) > 0 ? formatPrice(price, currency) : null;
  const buildWaLink = useCallback((proofUrl?: string | null) => {
    if (!phoneDigits) return null;
    const proofCode = subscription?.publicCode ?? subscription?.id;
    const shortProofUrl =
      proofUrl && proofCode && typeof window !== "undefined"
        ? `${window.location.origin}/s/${proofCode}`
        : proofUrl;
    const message = proofUrl
      ? [
          `Hola ${storeName}, ya subí mi comprobante de pago.`,
          `Plan: *${planName}*`,
          `Cliente: ${name} (${phone})`,
          ...(amountLabel ? [`Monto: ${amountLabel}`] : []),
          `Comprobante: ${shortProofUrl}`,
        ].join("\n")
      : `Hola ${storeName}, quiero suscribirme al plan *${planName}*. Mi nombre es ${name}.`;
    return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
  }, [amountLabel, name, phone, phoneDigits, planName, storeName, subscription?.id, subscription?.publicCode]);

  const waLink = useMemo(
    () => buildWaLink(subscription?.proofUrl),
    [buildWaLink, subscription?.proofUrl],
  );

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
      const created = await storefrontApi.createSubscription(subdomain, {
        customerName: name,
        customerPhone: phone,
        planName,
        productId,
        note: note || undefined,
      });
      setSubscription(created);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo suscribir.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadProof(file: File) {
    setProofError("");
    if (!subscription) {
      setProofError("Primero registra la solicitud.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProofError("El comprobante debe ser una imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError("La imagen no debe pesar más de 5 MB.");
      return;
    }

    setUploadingProof(true);
    try {
      const updated = await storefrontApi.submitSubscriptionProof(
        subdomain,
        subscription.id,
        file,
      );
      if (!updated.proofUrl) {
        throw new Error("El comprobante se recibió, pero no llegó el enlace de la imagen. Actualiza la página e inténtalo otra vez.");
      }
      setSubscription(updated);
    } catch (e) {
      setProofError(e instanceof Error ? e.message : "No se pudo subir el comprobante.");
    } finally {
      setUploadingProof(false);
    }
  }

  const hasYape = Boolean(yapeQrUrl || yapeNumber || plinQrUrl || plinNumber);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${done ? "max-w-2xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <header className="relative px-5 py-3 text-center text-white" style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}>
              <button onClick={onClose} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
              <h2 className="text-base font-black">📡 ¡Solicitud registrada!</h2>
              <p className="mt-0.5 text-xs font-semibold text-white/80">El negocio validará el pago y coordinará la activación</p>
            </header>
            <div className="space-y-2.5 overflow-y-auto p-4">
              <div className="rounded-2xl bg-slate-950 p-2.5 text-left text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Resumen</p>
                <div className="mt-1.5 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3"><span className="text-white/60">Plan</span><b className="text-right">{planName}</b></div>
                  <div className="flex justify-between gap-3"><span className="text-white/60">Cliente</span><b className="text-right">{name || "—"}</b></div>
                  <div className="flex justify-between gap-3"><span className="text-white/60">WhatsApp</span><b className="text-right">{phone || "—"}</b></div>
                  {price != null && Number(price) > 0 && (
                    <div className="flex justify-between gap-3"><span className="text-white/60">Monto</span><b className="text-right">{formatPrice(price, currency)}</b></div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-emerald-700">1. Solicitud</div>
                <div className="rounded-lg bg-violet-50 px-2 py-1.5 text-center text-violet-700">2. Pago</div>
                <div className="rounded-lg bg-sky-50 px-2 py-1.5 text-center text-sky-700">3. Activación</div>
              </div>

              <div className={`grid gap-3 md:items-start ${subscription?.proofUrl ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
                {hasYape && !subscription?.proofUrl && (
                  <div className="rounded-2xl bg-violet-50 p-3 text-left ring-1 ring-violet-100">
                    <p className="mb-2 text-center text-sm font-black text-violet-700">💳 Elige cómo pagar</p>
                    <PayOptions
                      yapeQrUrl={yapeQrUrl}
                      yapeHolderName={yapeHolderName}
                      yapeNumber={yapeNumber}
                      plinQrUrl={plinQrUrl}
                      plinHolderName={plinHolderName}
                      plinNumber={plinNumber}
                    />
                    {price != null && Number(price) > 0 && (
                      <p className="mt-2 text-center text-sm text-gray-700">Monto: <b className="text-violet-700">{formatPrice(price, currency)}</b></p>
                    )}
                  </div>
                )}

                {subscription?.proofUrl ? (
                  <div className="rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
                    <a href={subscription.proofUrl} target="_blank" rel="noopener noreferrer" className="mx-auto mb-2 block w-fit">
                      <Image src={subscription.proofUrl} alt="Comprobante enviado" width={96} height={128} className="mx-auto h-24 w-auto rounded-xl object-cover ring-1 ring-emerald-300" />
                    </a>
                    <p className="text-sm font-black text-emerald-700">✅ Comprobante recibido</p>
                    <p className="mt-1 text-xs font-medium text-emerald-700">Ya aparece en el panel del negocio para validar tu pago.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200">
                    <p className="text-sm font-black text-slate-800">📎 Subir comprobante</p>
                    <p className="mt-1 text-xs text-slate-500">Después de pagar, sube una foto o captura para que el negocio valide el pago.</p>
                    <label className="mt-2 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-center">
                      <span className="text-sm font-semibold text-violet-700">{uploadingProof ? "Subiendo..." : "📸 Subir captura del pago"}</span>
                      <span className="mt-1 text-xs text-gray-500">JPG o PNG, máx. 5MB</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingProof} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); }} />
                    </label>
                    {proofError && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">{proofError}</p>}
                  </div>
                )}
              </div>

              {waLink && (subscription?.proofUrl || !hasYape) && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full bg-green-500 py-2.5 text-center font-bold text-white hover:bg-green-600">
                  💬 {subscription?.proofUrl ? "Enviar comprobante al negocio" : "Coordinar por WhatsApp"}
                </a>
              )}
              <button onClick={onClose} className="block w-full py-1 text-sm font-semibold text-gray-500 hover:text-gray-700">Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: accent }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">Solicitud de servicio</p>
                <h2 className="text-base font-black">{actionLabel}: {planName}</h2>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
            </header>
            <div className="space-y-3 overflow-y-auto p-5">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                Este flujo es para contratar o activar un plan. No usa carrito, recojo ni entrega a domicilio.
              </div>
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
              <p className="text-center text-xs text-gray-500">El negocio validará tu solicitud y coordinará la activación por WhatsApp.</p>
            </div>
          </>
        )}
        <style>{`.sub-input{width:100%;border-radius:0.75rem;border:1px solid #e5e7eb;padding:0.6rem 0.75rem;font-size:0.95rem;outline:none}.sub-input:focus{border-color:#94a3b8}`}</style>
      </div>
    </div>
  );
}
