"use client";

import { useEffect, useState } from "react";
import { superApi, type PlatformSettings, refreshPublicPrices } from "@/lib/superadmin-api";

const CONTROL = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

export default function PlatformConfigPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superApi
      .getSettings()
      .then(setSettings)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo cargar la configuración."));
  }, []);

  function update<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    const phone = localPhone(settings.supportWhatsapp);
    if (phone && !/^9\d{8}$/.test(phone)) {
      setError("El WhatsApp de soporte debe tener 9 dígitos y empezar con 9.");
      setSaved(false);
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await superApi.updateSettings({
        platformName: settings.platformName,
        currency: settings.currency,
        supportWhatsapp: phone ? `51${phone}` : "",
        supportEmail: settings.supportEmail ?? undefined,
        legalName: settings.legalName ?? "",
        legalRuc: settings.legalRuc ?? "",
        legalAddress: settings.legalAddress ?? "",
        trialDays: Number(settings.trialDays),
      });
      setSettings(result);
      setSaved(true);
      // Días de prueba y WhatsApp de ventas: la página de precios los muestra al instante.
      void refreshPublicPrices();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>;
  if (!settings) return <div className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />;

  return (
    <div className="w-full space-y-6 pb-24">
      <header>
        <p className="text-sm font-bold text-violet-700">Plataforma</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">Configuración general</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
          Define la identidad, los canales de soporte, el periodo de prueba y los textos legales de MiTiendita.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Section title="Identidad" description="Información principal que identifica a la plataforma.">
          <Field label="Nombre de la plataforma">
            <input value={settings.platformName} onChange={(event) => update("platformName", event.target.value)} className={CONTROL} />
          </Field>
          <Field label="Dirección de la web" help="Automática: la define el hosting">
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              <span className="truncate">{window.location.host}</span>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800">En uso</span>
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moneda" help="Referencial">
              <input value={settings.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} maxLength={3} className={CONTROL} />
            </Field>
            <Field label="Días de prueba gratuita" help="Toda tienda nueva">
              <input type="number" min={0} max={365} value={settings.trialDays} onChange={(event) => update("trialDays", Number(event.target.value))} className={CONTROL} />
            </Field>
          </div>
        </Section>

        <Section title="Soporte" description="Se muestran como contacto en las páginas públicas de Términos y Privacidad.">
          <Field label="WhatsApp de soporte" help="Celular de 9 dígitos">
            <div className="flex">
              <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-600">+51</span>
              <input
                inputMode="numeric"
                maxLength={9}
                value={localPhone(settings.supportWhatsapp)}
                onChange={(event) => update("supportWhatsapp", event.target.value.replace(/\D/g, "").slice(0, 9))}
                className={`${CONTROL} rounded-l-none`}
                placeholder="987654321"
              />
            </div>
          </Field>
          <Field label="Correo de soporte">
            <input type="email" value={settings.supportEmail ?? ""} onChange={(event) => update("supportEmail", event.target.value)} className={CONTROL} placeholder="soporte@mitiendita.com" />
          </Field>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            Estos datos son globales. El WhatsApp y Yape de cada tienda se configuran desde su propio panel administrativo.
          </div>
        </Section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Titular legal de la plataforma</h2>
              <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-600">
                La Ley N.° 29733 y el Código del Consumidor exigen identificar a quien opera la plataforma. Estos datos se
                insertan automáticamente en los Términos y la Política de privacidad que ven tus clientes.
              </p>
            </div>
            <div className="flex gap-2">
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">
                Ver Términos ↗
              </a>
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">
                Ver Privacidad ↗
              </a>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_3fr]">
            <Field label="Nombre o razón social" help="Persona natural o empresa">
              <input value={settings.legalName ?? ""} onChange={(event) => update("legalName", event.target.value)} className={CONTROL} placeholder="Ej.: Juan Pérez Gómez o Mi Empresa S.A.C." />
            </Field>
            <Field label="RUC" help="11 dígitos">
              <input inputMode="numeric" maxLength={11} value={settings.legalRuc ?? ""} onChange={(event) => update("legalRuc", event.target.value.replace(/\D/g, ""))} className={CONTROL} placeholder="10XXXXXXXXX" />
            </Field>
            <Field label="Domicilio legal">
              <input value={settings.legalAddress ?? ""} onChange={(event) => update("legalAddress", event.target.value)} className={CONTROL} placeholder="Av. Ejemplo 123, Distrito, Lima" />
            </Field>
          </div>
          {!(settings.legalName && settings.legalRuc && settings.legalAddress) && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
              Completa los tres datos: mientras falten, los documentos legales no identifican plenamente al titular.
            </p>
          )}
        </section>
      </div>

      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite">
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          {saved && <p className="text-sm font-semibold text-emerald-700">Configuración guardada correctamente.</p>}
          {!error && !saved && <p className="text-sm font-medium text-slate-500">Revisa los cambios antes de guardar.</p>}
        </div>
        <button onClick={save} disabled={saving} className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
        <span>{label}</span>
        {help && <span className="text-right text-xs font-medium text-slate-500">{help}</span>}
      </span>
      {children}
    </label>
  );
}

/** Número guardado (51XXXXXXXXX) → los 9 dígitos que se escriben en el campo. */
function localPhone(value: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 9 && digits.startsWith("51") ? digits.slice(2) : digits;
}
