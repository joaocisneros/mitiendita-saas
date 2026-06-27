"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storefrontApi, type SubscriptionView } from "@/lib/api";
import { formatPrice } from "@/lib/format";

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
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
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

  async function uploadProof() {
    setProofError("");
    if (!subscription) {
      setProofError("Primero registra la solicitud.");
      return;
    }
    if (!proofFile) {
      setProofError("Selecciona una foto del comprobante.");
      return;
    }
    if (!proofFile.type.startsWith("image/")) {
      setProofError("El comprobante debe ser una imagen.");
      return;
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      setProofError("La imagen no debe pesar más de 5 MB.");
      return;
    }

    setUploadingProof(true);
    try {
      const updated = await storefrontApi.submitSubscriptionProof(
        subdomain,
        subscription.id,
        proofFile,
      );
      if (!updated.proofUrl) {
        throw new Error("El comprobante se recibió, pero no llegó el enlace de la imagen. Actualiza la página e inténtalo otra vez.");
      }
      setSubscription(updated);
      setProofFile(null);
    } catch (e) {
      setProofError(e instanceof Error ? e.message : "No se pudo subir el comprobante.");
    } finally {
      setUploadingProof(false);
    }
  }

  const hasYape = Boolean(yapeQrUrl || yapeNumber);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${done ? "max-w-2xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <header
              className="relative px-5 py-4 text-center text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}
            >
              <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
              <p className="text-2xl">📡</p>
              <h2 className="mt-1 text-lg font-black">Solicitud de plan registrada</h2>
              <p className="mt-1 text-xs font-semibold text-white/80">Activación coordinada por el negocio</p>
            </header>
            <div className="space-y-3 overflow-y-auto p-4 text-center sm:p-5">
              <p className="text-sm text-gray-700">
                Tu solicitud del plan <b>{planName}</b> quedó registrada. Este flujo no es un pedido con entrega a domicilio: el negocio validará el pago y coordinará la activación contigo.
              </p>

              <div className="rounded-2xl bg-slate-950 p-3 text-left text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Resumen de activación</p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">Plan</span>
                    <b className="text-right">{planName}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">Cliente</span>
                    <b className="text-right">{name || "—"}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">WhatsApp</span>
                    <b className="text-right">{phone || "—"}</b>
                  </div>
                  {price != null && Number(price) > 0 && (
                    <div className="flex justify-between gap-3 border-t border-white/10 pt-2">
                      <span className="text-white/60">Monto</span>
                      <b className="text-right text-lg">{formatPrice(price, currency)}</b>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-bold sm:text-xs">
                <div className="rounded-xl bg-emerald-50 px-2 py-2 text-emerald-700">1. Solicitud</div>
                <div className="rounded-xl bg-violet-50 px-2 py-2 text-violet-700">2. Pago</div>
                <div className="rounded-xl bg-sky-50 px-2 py-2 text-sky-700">3. Activación</div>
              </div>

              <div className={`grid gap-3 md:items-start ${subscription?.proofUrl ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
              {hasYape && !subscription?.proofUrl && (
                <div className="rounded-2xl bg-violet-50 p-3 text-left ring-1 ring-violet-100">
                  <p className="text-center text-sm font-black text-violet-700">💜 Pagar con Yape</p>
                  {yapeQrUrl && (
                    <div className="relative mx-auto mt-2 h-32 w-32 sm:h-36 sm:w-36">
                      <Image src={yapeQrUrl} alt="QR Yape" fill sizes="144px" className="object-contain" />
                    </div>
                  )}
                  <div className="mt-2 space-y-1 text-center text-sm text-gray-700">
                    {yapeHolderName && <p>Titular: <b>{yapeHolderName}</b></p>}
                    {yapeNumber && <p>Número Yape: <b>{yapeNumber}</b></p>}
                    {price != null && Number(price) > 0 && (
                      <p className="text-base">Monto: <b className="text-violet-700">{formatPrice(price, currency)}</b></p>
                    )}
                  </div>
                </div>
              )}

              {subscription?.proofUrl ? (
                <div className="rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
                  <a href={subscription.proofUrl} target="_blank" rel="noopener noreferrer" className="mx-auto mb-3 block w-fit">
                    <Image src={subscription.proofUrl} alt="Comprobante enviado" width={96} height={128} className="mx-auto h-28 w-auto rounded-xl object-cover ring-1 ring-emerald-300" />
                  </a>
                  <p className="text-sm font-black text-emerald-700">
                    ✅ Comprobante recibido por {storeName}
                  </p>
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    Ya aparece en el panel del negocio para validar tu pago.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200">
                  <p className="text-sm font-black text-slate-800">📎 Subir comprobante</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Después de pagar por Yape, sube una foto o captura para que el negocio valide el pago.
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      setProofError("");
                      setProofFile(e.target.files?.[0] ?? null);
                    }}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  {proofFile && (
                    <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                      Archivo listo: {proofFile.name}. Ahora presiona “Subir comprobante”.
                    </p>
                  )}
                  {proofError && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">{proofError}</p>}
                  <button
                    onClick={uploadProof}
                    disabled={uploadingProof || !proofFile}
                    className="mt-3 w-full rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {uploadingProof ? "Subiendo comprobante..." : "Subir comprobante"}
                  </button>
                  <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
                    Después de subirlo aparecerá el botón para enviarlo por WhatsApp.
                  </p>
                </div>
              )}
              </div>

              {waLink && (subscription?.proofUrl || !hasYape) && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full bg-green-500 py-3 font-bold text-white hover:bg-green-600">
                  💬 {subscription?.proofUrl ? "Enviar comprobante al negocio" : "Coordinar por WhatsApp"}
                </a>
              )}
              {subscription?.proofUrl && (
                <p className="mx-auto max-w-sm text-center text-xs font-semibold text-slate-500">
                  Se abre el chat del negocio con tu solicitud y el enlace de la foto. La foto también quedó guardada en su panel.
                </p>
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
