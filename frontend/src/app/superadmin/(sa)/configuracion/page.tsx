"use client";

import { useEffect, useState } from "react";
import { superApi, type PlatformSettings } from "@/lib/superadmin-api";

export default function PlatformConfigPage() {
  const [s, setS] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superApi.getSettings().then(setS).catch((e) => setError(e.message));
  }, []);

  function set<K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
    setOk(false);
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    setError("");
    setOk(false);
    try {
      await superApi.updateSettings({
        platformName: s.platformName,
        mainDomain: s.mainDomain,
        currency: s.currency,
        supportWhatsapp: s.supportWhatsapp ?? undefined,
        supportEmail: s.supportEmail ?? undefined,
        terms: s.terms ?? undefined,
        privacy: s.privacy ?? undefined,
        trialDays: Number(s.trialDays),
      });
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (error && !s) return <p className="text-red-600">{error}</p>;
  if (!s) return <p className="text-slate-400">Cargando...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Plataforma</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Configuración general</h1>
      </div>

      <Section title="Identidad">
        <Field label="Nombre de la plataforma"><input value={s.platformName} onChange={(e) => set("platformName", e.target.value)} className="inp" /></Field>
        <Field label="Dominio principal"><input value={s.mainDomain} onChange={(e) => set("mainDomain", e.target.value)} className="inp" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda"><input value={s.currency} onChange={(e) => set("currency", e.target.value)} className="inp" /></Field>
          <Field label="Días de prueba gratis"><input type="number" value={s.trialDays} onChange={(e) => set("trialDays", Number(e.target.value))} className="inp" /></Field>
        </div>
      </Section>

      <Section title="Soporte">
        <Field label="WhatsApp de soporte"><input value={s.supportWhatsapp ?? ""} onChange={(e) => set("supportWhatsapp", e.target.value)} className="inp" /></Field>
        <Field label="Correo de soporte"><input value={s.supportEmail ?? ""} onChange={(e) => set("supportEmail", e.target.value)} className="inp" /></Field>
      </Section>

      <Section title="Legal">
        <Field label="Términos y condiciones"><textarea value={s.terms ?? ""} onChange={(e) => set("terms", e.target.value)} rows={3} className="inp" /></Field>
        <Field label="Política de privacidad"><textarea value={s.privacy ?? ""} onChange={(e) => set("privacy", e.target.value)} rows={3} className="inp" /></Field>
      </Section>

      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {ok && <p className="rounded bg-green-50 p-2 text-sm text-green-700">✅ Guardado.</p>}

      <button onClick={save} disabled={saving} className="w-full rounded-full bg-violet-600 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>

      <style>{`.inp{width:100%;border-radius:0.75rem;border:1px solid #cbd5e1;padding:0.6rem 0.75rem;font-size:0.95rem;color:#0f172a;outline:none}.inp:focus{border-color:#7c3aed}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-black text-slate-950">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
