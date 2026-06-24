"use client";

import { useEffect, useMemo, useState } from "react";
import { storefrontApi } from "@/lib/api";

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
 * Reserva de un servicio: guarda la cita en el sistema y, al confirmar,
 * abre WhatsApp del negocio para coordinar. Para rubros de Servicios.
 */
export function ServiceReserveModal({
  subdomain,
  storeName,
  serviceName,
  productId,
  accent,
  whatsappNumber,
  actionLabel,
  onClose,
}: {
  subdomain: string;
  storeName: string;
  serviceName: string;
  productId?: string;
  accent: string;
  whatsappNumber: string | null;
  actionLabel: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
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

  const minDay = useMemo(() => new Date().toLocaleDateString("en-CA"), []); // YYYY-MM-DD local
  const whenIso = day && time ? new Date(`${day}T${time}`).toISOString() : "";
  const phoneDigits = whatsappNumber?.replace(/\D/g, "");
  const prettyWhen = whenIso ? new Date(whenIso).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" }) : "";
  const waLink =
    phoneDigits && whenIso
      ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
          `Hola ${storeName}, reservé: *${serviceName}* para el ${prettyWhen}. Mi nombre es ${name}.`,
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
    if (!day || !time) {
      setError("Elige el día y la hora que prefieres.");
      return;
    }
    setSaving(true);
    try {
      await storefrontApi.createAppointment(subdomain, {
        customerName: name,
        customerPhone: phone,
        serviceName,
        productId,
        preferredAt: whenIso,
        note: note || undefined,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reservar.");
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
              <p className="text-3xl">✅</p>
              <h2 className="mt-1 text-lg font-black">¡Reserva registrada!</h2>
            </header>
            <div className="space-y-4 p-5 text-center">
              <p className="text-sm text-gray-700">
                Tu solicitud de <b>{serviceName}</b> para el <b>{prettyWhen}</b> quedó registrada. El negocio la verá en su panel y la confirmará.
              </p>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full rounded-full bg-green-500 py-3 font-bold text-white hover:bg-green-600">
                  💬 Confirmar por WhatsApp con el negocio
                </a>
              )}
              <button onClick={onClose} className="block w-full py-1 text-sm font-semibold text-gray-500 hover:text-gray-700">Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: accent }}>
              <h2 className="text-base font-black">Reservar: {serviceName}</h2>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30" aria-label="Cerrar">✕</button>
            </header>
            <div className="space-y-3 overflow-y-auto p-5">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Tu nombre *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="srv-input" placeholder="Ej: María Pérez" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Teléfono / WhatsApp *</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" maxLength={9} className="srv-input" placeholder="Ej: 987654321" />
                {phone.length > 0 && !/^9\d{8}$/.test(phone) && (
                  <span className="mt-1 block text-xs font-medium text-amber-600">Debe ser un celular de 9 dígitos que empieza con 9.</span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Día *</span>
                  <input type="date" value={day} min={minDay} onChange={(e) => setDay(e.target.value)} className="srv-input" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Hora *</span>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className="srv-input bg-white">
                    <option value="">Elige hora</option>
                    {TIME_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {prettyWhen && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">📅 {prettyWhen}</p>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Nota (opcional)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="srv-input" rows={2} placeholder="Algún detalle para el negocio" />
              </label>
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
              <button onClick={submit} disabled={saving} style={{ backgroundColor: accent }} className="w-full rounded-full py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                {saving ? "Reservando..." : `${actionLabel} →`}
              </button>
              <p className="text-center text-xs text-gray-500">El negocio confirmará tu cita. El horario es una preferencia, puede ajustarse por WhatsApp.</p>
            </div>
          </>
        )}
        <style>{`.srv-input{width:100%;border-radius:0.75rem;border:1px solid #e5e7eb;padding:0.6rem 0.75rem;font-size:0.95rem;outline:none}.srv-input:focus{border-color:#94a3b8}`}</style>
      </div>
    </div>
  );
}
