"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { DashboardIcon } from "@/components/DashboardIcon";
import { BUSINESS_CATEGORIES } from "@/lib/business-categories";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ responsibleName: "", email: "", password: "", commercialName: "", subdomain: "", whatsappNumber: "", businessType: BUSINESS_CATEGORIES[0].subtypes[0] });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function normalizeSubdomain(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    setLoading(true);
    try {
      await adminApi.register({ ...form, email: form.email.trim(), subdomain: normalizeSubdomain(form.subdomain), whatsappNumber: form.whatsappNumber.replace(/\s/g, "") });
      router.push("/panel");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear la tienda.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[0.8fr_1.2fr]">
        <section className="relative overflow-hidden bg-violet-700 p-8 text-white sm:p-10">
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
          <div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><DashboardIcon name="store" /></span><span className="text-xl font-black">MiTiendita</span></div>
          <div className="relative mt-16"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Empieza hoy</p><h1 className="mt-3 text-3xl font-black leading-tight">Tu tienda online lista para recibir pedidos.</h1><ul className="mt-8 space-y-4 text-sm font-semibold text-violet-100"><li>✓ Catálogo público propio</li><li>✓ Pedidos organizados</li><li>✓ Pagos por Yape</li><li>✓ Envío directo a WhatsApp</li></ul></div>
        </section>
        <section className="p-6 sm:p-10">
          <p className="text-sm font-bold text-violet-700">Crea tu cuenta</p><h2 className="mt-1 text-3xl font-black text-slate-950">Registra tu negocio</h2><p className="mt-2 text-sm font-medium text-slate-600">Completa los datos y entra directamente a tu panel.</p>
          <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del responsable"><input required minLength={2} value={form.responsibleName} onChange={(e) => set("responsibleName", e.target.value)} className="field" placeholder="María Pérez" /></Field>
            <Field label="Correo electrónico"><input required type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="field" placeholder="maria@empresa.com" /></Field>
            <Field label="Nombre comercial"><input required minLength={2} value={form.commercialName} onChange={(e) => { const value = e.target.value; setForm((current) => ({ ...current, commercialName: value, subdomain: current.subdomain || normalizeSubdomain(value) })); }} className="field" placeholder="Bodega María" /></Field>
            <Field label="Rubro"><select value={form.businessType} onChange={(e) => set("businessType", e.target.value)} className="field">{BUSINESS_CATEGORIES.map((cat) => <optgroup key={cat.id} label={`${cat.emoji} ${cat.label}`}>{cat.subtypes.map((type) => <option key={type}>{type}</option>)}</optgroup>)}</select></Field>
            <Field label="Dirección web"><div className="flex"><input required minLength={3} value={form.subdomain} onChange={(e) => set("subdomain", normalizeSubdomain(e.target.value))} className="field rounded-r-none" placeholder="bodega-maria" /><span className="flex items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-600">.mitiendita.com</span></div></Field>
            <Field label="WhatsApp"><input required inputMode="tel" minLength={6} value={form.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} className="field" placeholder="51987654321" /></Field>
            <div className="sm:col-span-2"><Field label="Contraseña"><div className="relative"><input required type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} className="field pr-20" placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-700">{showPassword ? "Ocultar" : "Mostrar"}</button></div></Field></div>
            {error && <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={loading} className="sm:col-span-2 h-12 rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-60">{loading ? "Creando tu tienda..." : "Crear mi tienda"}</button>
          </form>
          <p className="mt-6 text-center text-sm font-medium text-slate-600">¿Ya tienes una cuenta? <Link href="/panel/login" className="font-bold text-violet-700 hover:underline">Inicia sesión</Link></p>
        </section>
      </div>
      <style>{`.field{height:3rem;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;background:#fff;padding:0 .8rem;color:#0f172a;outline:none}.field:focus{border-color:#7c3aed;box-shadow:0 0 0 4px #ede9fe}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-800">{label}</span>{children}</label>; }
