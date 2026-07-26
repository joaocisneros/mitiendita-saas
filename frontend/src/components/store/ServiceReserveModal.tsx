"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { storefrontApi, type AppointmentView } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { PayOptions } from "@/components/store/PayOptions";

/** Horarios de atención disponibles (cada 30 min, 8:00 a 8:00 pm). */
const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const ampm = h < 12 ? "am" : "pm";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      slots.push({ value, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}` });
    }
  }
  return slots;
})();

/**
 * Reserva de un servicio: puede registrarse sin pago o con adelanto por Yape.
 * Si el cliente sube comprobante, queda guardado en el panel y puede avisarlo
 * manualmente por WhatsApp.
 */
export function ServiceReserveModal({
  subdomain,
  storeName,
  serviceName,
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
  reservationPaymentMode,
  reservationAdvanceType,
  reservationAdvanceValue,
  onClose,
}: {
  subdomain: string;
  storeName: string;
  serviceName: string;
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
  reservationPaymentMode?: "none" | "optional" | "required" | null;
  reservationAdvanceType?: "fixed" | "percent" | null;
  reservationAdvanceValue?: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const normalizedReservationMode =
    reservationPaymentMode === "none" || reservationPaymentMode === "required"
      ? reservationPaymentMode
      : "optional";
  const normalizedAdvanceType =
    reservationAdvanceType === "fixed" ? "fixed" : "percent";

  const [paymentChoice, setPaymentChoice] = useState<"none" | "advance">(
    normalizedReservationMode === "required" ? "advance" : "none",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofError, setProofError] = useState("");
  const [paymentConfig, setPaymentConfig] = useState({
    yapeQrUrl: yapeQrUrl ?? null,
    yapeHolderName: yapeHolderName ?? null,
    yapeNumber: yapeNumber ?? null,
    plinQrUrl: plinQrUrl ?? null,
    plinHolderName: plinHolderName ?? null,
    plinNumber: plinNumber ?? null,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    setPaymentConfig({
      yapeQrUrl: yapeQrUrl ?? null,
      yapeHolderName: yapeHolderName ?? null,
      yapeNumber: yapeNumber ?? null,
      plinQrUrl: plinQrUrl ?? null,
      plinHolderName: plinHolderName ?? null,
      plinNumber: plinNumber ?? null,
    });
  }, [yapeHolderName, yapeNumber, yapeQrUrl, plinHolderName, plinNumber, plinQrUrl]);

  useEffect(() => {
    if (paymentConfig.yapeQrUrl || paymentConfig.yapeNumber || paymentConfig.plinQrUrl || paymentConfig.plinNumber) return;
    let cancelled = false;
    storefrontApi
      .getStore(subdomain)
      .then(({ store }) => {
        if (cancelled) return;
        setPaymentConfig({
          yapeQrUrl: store.yapeQrUrl ?? null,
          yapeHolderName: store.yapeHolderName ?? null,
          yapeNumber: store.yapeNumber ?? null,
          plinQrUrl: store.plinQrUrl ?? null,
          plinHolderName: store.plinHolderName ?? null,
          plinNumber: store.plinNumber ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [paymentConfig.yapeNumber, paymentConfig.yapeQrUrl, paymentConfig.plinNumber, paymentConfig.plinQrUrl, subdomain]);

  const minDay = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const whenIso = day && time ? new Date(`${day}T${time}`).toISOString() : "";
  const prettyWhen = whenIso
    ? new Date(whenIso).toLocaleString("es-PE", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

  const hasYape = Boolean(paymentConfig.yapeQrUrl || paymentConfig.yapeNumber || paymentConfig.plinQrUrl || paymentConfig.plinNumber);
  const servicePrice = Number(price ?? 0);
  const servicePriceLabel =
    Number.isFinite(servicePrice) && servicePrice > 0
      ? formatPrice(servicePrice, currency)
      : null;

  const configuredAdvance = useMemo(() => {
    if (!Number.isFinite(servicePrice) || servicePrice <= 0) return null;
    const configuredValue = Number(reservationAdvanceValue ?? 30);
    if (!Number.isFinite(configuredValue) || configuredValue <= 0) return null;
    const raw =
      normalizedAdvanceType === "fixed"
        ? configuredValue
        : servicePrice * (configuredValue / 100);
    const rounded = Math.round(raw * 100) / 100;
    return Math.min(servicePrice, rounded);
  }, [normalizedAdvanceType, reservationAdvanceValue, servicePrice]);
  const advanceLabel =
    configuredAdvance != null ? formatPrice(configuredAdvance, currency) : null;
  const canUseAdvance =
    normalizedReservationMode !== "none" &&
    Boolean(hasYape && configuredAdvance && configuredAdvance > 0);

  const phoneDigits = whatsappNumber?.replace(/\D/g, "");
  const buildWaLink = useCallback(
    (proofUrl?: string | null) => {
      if (!phoneDigits) return null;
      const base = [
        `Hola ${storeName}, solicité una reserva.`,
        `Servicio: *${serviceName}*`,
        `Cliente: ${name} (${phone})`,
        `Horario solicitado: ${prettyWhen}`,
        ...(note ? [`Nota: ${note}`] : []),
      ];
      const paymentLines = proofUrl
        ? [
            `Adelanto: ${advanceLabel ?? "Por confirmar"}`,
            `Comprobante: ${proofUrl}`,
          ]
        : appointment?.paymentMode === "advance"
          ? [`Adelanto elegido: ${advanceLabel ?? "Por confirmar"}`]
          : ["Reserva sin adelanto. Coordinaré el pago con el negocio."];
      const message = [...base, ...paymentLines].join("\n");
      return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    },
    [
      advanceLabel,
      appointment?.paymentMode,
      name,
      note,
      phone,
      phoneDigits,
      prettyWhen,
      serviceName,
      storeName,
    ],
  );

  const waLink = useMemo(
    () => buildWaLink(appointment?.proofUrl),
    [appointment?.proofUrl, buildWaLink],
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
    if (!day || !time) {
      setError("Elige el día y la hora que prefieres.");
      return;
    }
    if (normalizedReservationMode === "required" && !canUseAdvance) {
      setError("Este servicio requiere adelanto, pero falta configurar Yape o el monto del adelanto.");
      return;
    }
    if (paymentChoice === "advance") {
      if (!hasYape) {
        setError("El negocio aún no configuró Yape. Usa reserva sin pago.");
        return;
      }
      if (!configuredAdvance || configuredAdvance <= 0) {
        setError("No se pudo calcular el adelanto para este servicio.");
        return;
      }
    }

    setSaving(true);
    try {
      const created = await storefrontApi.createAppointment(subdomain, {
        customerName: name,
        customerPhone: phone,
        serviceName,
        productId,
        preferredAt: whenIso,
        note: note || undefined,
        paymentMode: paymentChoice,
        advanceAmount:
          paymentChoice === "advance" && configuredAdvance
            ? configuredAdvance
            : undefined,
      });
      setAppointment(created);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reservar.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadProof(file: File) {
    setProofError("");
    if (!appointment) {
      setProofError("Primero registra la reserva.");
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
      const updated = await storefrontApi.submitAppointmentProof(
        subdomain,
        appointment.id,
        file,
      );
      if (!updated.proofUrl) {
        throw new Error(
          "El comprobante se recibió, pero no llegó el enlace de la imagen. Actualiza la página e inténtalo otra vez.",
        );
      }
      setAppointment(updated);
    } catch (e) {
      setProofError(e instanceof Error ? e.message : "No se pudo subir el comprobante.");
    } finally {
      setUploadingProof(false);
    }
  }

  const usesAdvance = appointment?.paymentMode === "advance";
  const proofUploaded = Boolean(appointment?.proofUrl);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          done ? "max-w-2xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <header
              className="relative px-5 py-3 text-center text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, #0f172a)` }}
            >
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                aria-label="Cerrar"
              >
                ✕
              </button>
              <h2 className="text-base font-black">📅 ¡Reserva registrada!</h2>
              <p className="mt-0.5 text-xs font-semibold text-white/80">
                {usesAdvance ? "Adelanto pendiente de validación" : "El negocio confirmará disponibilidad"}
              </p>
            </header>

            <div className="space-y-3 overflow-y-auto p-4 text-center sm:p-5">
              <div className="rounded-2xl bg-slate-950 p-3 text-left text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                  Resumen de reserva
                </p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">Servicio</span>
                    <b className="text-right">{serviceName}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">Cliente</span>
                    <b className="text-right">{name}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">WhatsApp</span>
                    <b className="text-right">{phone}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">Horario</span>
                    <b className="text-right">{prettyWhen}</b>
                  </div>
                  {servicePriceLabel && (
                    <div className="flex justify-between gap-3 border-t border-white/10 pt-2">
                      <span className="text-white/60">Precio referencial</span>
                      <b className="text-right">{servicePriceLabel}</b>
                    </div>
                  )}
                  {usesAdvance && advanceLabel && (
                    <div className="flex justify-between gap-3 border-t border-white/10 pt-2">
                      <span className="text-white/60">Adelanto</span>
                      <b className="text-right text-lg">{advanceLabel}</b>
                    </div>
                  )}
                </div>
              </div>

              {!usesAdvance && (
                <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
                  <p className="text-sm font-black text-emerald-700">
                    ✅ Reserva recibida por {storeName}
                  </p>
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    No se pidió adelanto. Coordina la confirmación y cualquier pago por WhatsApp.
                  </p>
                </div>
              )}

              {usesAdvance && !proofUploaded && (
                <div className="grid gap-3 md:grid-cols-2 md:items-start">
                  {hasYape && (
                    <div className="rounded-2xl bg-violet-50 p-3 text-left ring-1 ring-violet-100">
                      <p className="mb-2 text-center text-sm font-black text-violet-700">
                        💳 Paga el adelanto
                      </p>
                      <PayOptions
                        yapeQrUrl={paymentConfig.yapeQrUrl}
                        yapeHolderName={paymentConfig.yapeHolderName}
                        yapeNumber={paymentConfig.yapeNumber}
                        plinQrUrl={paymentConfig.plinQrUrl}
                        plinHolderName={paymentConfig.plinHolderName}
                        plinNumber={paymentConfig.plinNumber}
                      />
                      {advanceLabel && (
                        <p className="mt-2 text-center text-base text-gray-700">
                          Adelanto: <b className="text-violet-700">{advanceLabel}</b>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200">
                    <p className="text-sm font-black text-slate-800">📎 Subir comprobante</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Después de pagar el adelanto, sube una foto o captura para que el negocio valide tu reserva.
                    </p>
                    <label className="mt-2 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-center">
                      <span className="text-sm font-semibold text-violet-700">{uploadingProof ? "Subiendo..." : "📸 Subir captura del pago"}</span>
                      <span className="text-xs text-gray-500">JPG o PNG, máx. 5MB</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingProof}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); }}
                      />
                    </label>
                    {proofError && (
                      <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">
                        {proofError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {usesAdvance && proofUploaded && appointment?.proofUrl && (
                <div className="rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
                  <a
                    href={appointment.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-auto mb-3 block w-fit"
                  >
                    <Image
                      src={appointment.proofUrl}
                      alt="Comprobante enviado"
                      width={96}
                      height={128}
                      className="mx-auto h-28 w-auto rounded-xl object-cover ring-1 ring-emerald-300"
                    />
                  </a>
                  <p className="text-sm font-black text-emerald-700">
                    ✅ Comprobante recibido por {storeName}
                  </p>
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    Ya aparece en el panel del negocio para validar el adelanto.
                  </p>
                </div>
              )}

              {waLink && (!usesAdvance || proofUploaded) && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-full bg-green-500 py-3 font-bold text-white hover:bg-green-600"
                >
                  💬 {proofUploaded ? "Enviar comprobante al negocio" : "Coordinar por WhatsApp"}
                </a>
              )}

              {proofUploaded && (
                <p className="mx-auto max-w-sm text-center text-xs font-semibold text-slate-500">
                  Se abre el chat del negocio con tu reserva y el enlace de la foto. La foto también quedó guardada en su panel.
                </p>
              )}

              <button
                onClick={onClose}
                className="block w-full py-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            <header
              className="flex items-center justify-between gap-3 px-5 py-3 text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
                  Solicitud de atención
                </p>
                <h2 className="truncate text-lg font-black">
                  {actionLabel}: {serviceName}
                </h2>
                {servicePriceLabel && (
                  <p className="mt-0.5 text-xs font-bold text-white/75">
                    Precio referencial: {servicePriceLabel}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg hover:bg-white/30"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            <div className="space-y-3 overflow-y-auto p-4 sm:p-5">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm">
                  📅
                </span>
                <div>
                  <p className="font-black text-slate-800">Reserva rápida</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Elige tu horario preferido. El negocio confirmará la atención por WhatsApp.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-700">Tu nombre *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="srv-input"
                    placeholder="Ej: María Pérez"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-700">
                    WhatsApp *
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    inputMode="numeric"
                    maxLength={9}
                    className="srv-input"
                    placeholder="Ej: 987654321"
                  />
                  {phone.length > 0 && !/^9\d{8}$/.test(phone) && (
                    <span className="mt-1 block text-xs font-medium text-amber-600">
                      Debe tener 9 dígitos y empezar con 9.
                    </span>
                  )}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-700">Día *</span>
                  <input
                    type="date"
                    value={day}
                    min={minDay}
                    onChange={(e) => setDay(e.target.value)}
                    className="srv-input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-700">Hora *</span>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="srv-input bg-white"
                  >
                    <option value="">Elige hora</option>
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {prettyWhen && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                  📅 {prettyWhen}
                </p>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-gray-700">Nota (opcional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="srv-input"
                  rows={2}
                  placeholder="Algún detalle para el negocio"
                />
              </label>

              {normalizedReservationMode === "none" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <span className="block text-sm font-black text-emerald-800">
                    Reserva sin pago
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-emerald-700">
                    Este servicio no pide adelanto. El pago se coordina por WhatsApp o en el local.
                  </span>
                </div>
              )}

              {normalizedReservationMode === "optional" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentChoice("none")}
                    className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                      paymentChoice === "none"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-black text-slate-900">Sin pago ahora</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                      Coordinarás el pago por WhatsApp.
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!canUseAdvance}
                    onClick={() => setPaymentChoice("advance")}
                    className={`rounded-2xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      paymentChoice === "advance"
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-black text-slate-900">
                      Con adelanto
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                      {canUseAdvance
                        ? `Adelanto: ${advanceLabel}`
                        : advanceLabel
                          ? `Adelanto ${advanceLabel} · falta configurar Yape`
                          : "Adelanto no configurado"}
                    </span>
                  </button>
                </div>
              )}

              {normalizedReservationMode === "required" && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3">
                  <span className="block text-sm font-black text-violet-800">
                    Este servicio requiere adelanto
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-violet-700">
                    {canUseAdvance
                      ? `Para reservar debes pagar ${advanceLabel} por Yape y subir tu comprobante.`
                      : !hasYape
                        ? `Falta configurar Yape para cobrar el adelanto${advanceLabel ? ` de ${advanceLabel}` : ""}.`
                        : "El negocio debe configurar el monto del adelanto para aceptar reservas."}
                  </span>
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
              <div className="rounded-2xl bg-white pt-1">
                <button
                  onClick={submit}
                  disabled={saving || (normalizedReservationMode === "required" && !canUseAdvance)}
                  style={{ backgroundColor: accent }}
                  className="w-full rounded-full py-3 font-black text-white shadow-lg shadow-slate-200 transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving
                    ? "Registrando..."
                    : normalizedReservationMode === "required" && !canUseAdvance
                      ? "Falta configurar Yape"
                      : paymentChoice === "advance"
                      ? "Registrar y pagar adelanto →"
                      : `${actionLabel} sin pago →`}
                </button>
                <p className="mx-auto mt-2 max-w-sm text-center text-[11px] font-semibold leading-4 text-gray-500">
                  El negocio confirmará tu cita. El horario es referencial y puede ajustarse por WhatsApp.
                </p>
              </div>
            </div>
          </>
        )}
        <style>{`.srv-input{width:100%;border-radius:0.75rem;border:1px solid #e5e7eb;padding:0.6rem 0.75rem;font-size:0.95rem;outline:none}.srv-input:focus{border-color:#94a3b8}`}</style>
      </div>
    </div>
  );
}
