"use client";

import { useEffect, useState } from "react";
import { superApi, type PlatformSettings } from "@/lib/superadmin-api";

const CONTROL = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100";
const TEXTAREA = "min-h-48 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

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
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await superApi.updateSettings({
        platformName: settings.platformName,
        mainDomain: settings.mainDomain,
        currency: settings.currency,
        supportWhatsapp: settings.supportWhatsapp ?? undefined,
        supportEmail: settings.supportEmail ?? undefined,
        terms: settings.terms ?? undefined,
        privacy: settings.privacy ?? undefined,
        trialDays: Number(settings.trialDays),
      });
      setSettings(result);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>;
  if (!settings) return <div className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <header>
        <p className="text-sm font-bold text-violet-700">Plataforma</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Configuración general</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
          Define la identidad, los canales de soporte, el periodo de prueba y los textos legales de MiTiendita.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Section title="Identidad" description="Información principal que identifica a la plataforma.">
          <Field label="Nombre de la plataforma">
            <input value={settings.platformName} onChange={(event) => update("platformName", event.target.value)} className={CONTROL} />
          </Field>
          <Field label="Dominio principal" help="Ejemplo: mitiendita.com. Cada empresa utilizará un subdominio propio.">
            <input value={settings.mainDomain} onChange={(event) => update("mainDomain", event.target.value)} className={CONTROL} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moneda">
              <input value={settings.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} maxLength={3} className={CONTROL} />
            </Field>
            <Field label="Días de prueba gratuita">
              <input type="number" min={1} value={settings.trialDays} onChange={(event) => update("trialDays", Number(event.target.value))} className={CONTROL} />
            </Field>
          </div>
        </Section>

        <Section title="Soporte" description="Datos visibles para que las empresas contacten al equipo de la plataforma.">
          <Field label="WhatsApp de soporte" help="Incluye código de país, por ejemplo: 51987654321.">
            <input inputMode="tel" value={settings.supportWhatsapp ?? ""} onChange={(event) => update("supportWhatsapp", event.target.value)} className={CONTROL} placeholder="51987654321" />
          </Field>
          <Field label="Correo de soporte">
            <input type="email" value={settings.supportEmail ?? ""} onChange={(event) => update("supportEmail", event.target.value)} className={CONTROL} placeholder="soporte@mitiendita.com" />
          </Field>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            Estos datos son globales. El WhatsApp y Yape de cada tienda se configuran desde su propio panel administrativo.
          </div>
        </Section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2 sm:p-6">
          <div className="mb-5 border-b border-slate-200 pb-4">
            <h2 className="text-lg font-black text-slate-950">Documentos legales</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
              Los campos amplios permiten redactar textos largos sin comprimir el contenido. Puedes redimensionarlos verticalmente.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Field label="Términos y condiciones" help={`${(settings.terms ?? "").length} caracteres`}>
              <textarea value={settings.terms ?? ""} onChange={(event) => update("terms", event.target.value)} className={TEXTAREA} placeholder="Escribe aquí los términos y condiciones de uso…" />
            </Field>
            <Field label="Política de privacidad" help={`${(settings.privacy ?? "").length} caracteres`}>
              <textarea value={settings.privacy ?? ""} onChange={(event) => update("privacy", event.target.value)} className={TEXTAREA} placeholder="Escribe aquí la política de privacidad…" />
            </Field>
          </div>
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
