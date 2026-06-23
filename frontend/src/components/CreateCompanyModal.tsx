"use client";

import { useState } from "react";
import { Overlay } from "@/components/OrderDetailModal";
import {
  superApi,
  type CreatedCompany,
  type Plan,
} from "@/lib/superadmin-api";

const BUSINESS_TYPES = [
  "Bodega o minimarket",
  "Farmacia",
  "Ferretería",
  "Ropa y accesorios",
  "Cosméticos",
  "Veterinaria",
  "Belleza y bienestar",
  "Otro",
];

export function CreateCompanyModal({
  plans,
  onClose,
  onCreated,
}: {
  plans: Plan[];
  onClose: () => void;
  onCreated: (company: CreatedCompany) => void;
}) {
  const [form, setForm] = useState({
    responsibleName: "",
    email: "",
    password: "",
    commercialName: "",
    subdomain: "",
    whatsappNumber: "",
    businessType: BUSINESS_TYPES[0],
    planId: plans.find((plan) => plan.slug === "basico")?.id ?? plans[0]?.id ?? 0,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof typeof form, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const created = await superApi.createCompany({
        ...form,
        email: form.email.trim(),
        subdomain: normalizeSubdomain(form.subdomain),
        whatsappNumber: form.whatsappNumber.replace(/\s/g, ""),
        planId: form.planId || undefined,
      });
      onCreated(created);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear la empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose} size="wide">
      <form onSubmit={submit} className="space-y-5">
        <header className="pr-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Nueva cuenta comercial</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Crear empresa</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Se crearán la tienda, el propietario y el periodo de prueba en una sola operación.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre comercial">
            <input
              required
              minLength={2}
              value={form.commercialName}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({
                  ...current,
                  commercialName: value,
                  subdomain: current.subdomain || normalizeSubdomain(value),
                }));
              }}
              className={CONTROL}
              placeholder="Bodega Central"
            />
          </Field>
          <Field label="Rubro">
            <select value={form.businessType} onChange={(event) => update("businessType", event.target.value)} className={CONTROL}>
              {BUSINESS_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Nombre del propietario">
            <input required minLength={2} value={form.responsibleName} onChange={(event) => update("responsibleName", event.target.value)} className={CONTROL} placeholder="María Pérez" />
          </Field>
          <Field label="Correo del propietario">
            <input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={CONTROL} placeholder="maria@empresa.com" />
          </Field>
          <Field label="Subdominio">
            <div className="flex">
              <input required minLength={3} value={form.subdomain} onChange={(event) => update("subdomain", normalizeSubdomain(event.target.value))} className={`${CONTROL} rounded-r-none`} placeholder="bodega-central" />
              <span className="flex items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-600">.mitiendita.com</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">En local: /tienda/{form.subdomain || "subdominio"}</p>
          </Field>
          <Field label="WhatsApp">
            <input required minLength={6} inputMode="tel" value={form.whatsappNumber} onChange={(event) => update("whatsappNumber", event.target.value)} className={CONTROL} placeholder="51987654321" />
          </Field>
          <Field label="Plan inicial">
            <select value={form.planId} onChange={(event) => update("planId", Number(event.target.value))} className={CONTROL}>
              {plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </Field>
          <Field label="Contraseña temporal">
            <div className="relative">
              <input required minLength={8} type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} className={`${CONTROL} pr-20`} placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-700">
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </Field>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button disabled={saving} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? "Creando empresa…" : "Crear empresa"}
          </button>
        </footer>
      </form>
    </Overlay>
  );
}

const CONTROL = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{children}</label>;
}

function normalizeSubdomain(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
