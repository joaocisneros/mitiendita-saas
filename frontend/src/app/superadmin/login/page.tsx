"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { superApi } from "@/lib/superadmin-api";
import { DashboardIcon } from "@/components/DashboardIcon";

export default function SuperLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await superApi.login(email.trim(), password);
      router.push("/superadmin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10">
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" /><div className="absolute -bottom-48 -right-36 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-950"><DashboardIcon name="companies" className="h-7 w-7" /></div><p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">MiTiendita</p><h1 className="mt-2 text-3xl font-black text-white">Administración global</h1><p className="mt-2 text-sm font-medium text-slate-300">Acceso exclusivo para administradores de la plataforma.</p></div>
        <form onSubmit={submit} className="space-y-5 rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Correo electrónico</span><div className="relative"><DashboardIcon name="mail" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="admin@mitiendita.com" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100" /></div></label>
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Contraseña</span><div className="relative"><DashboardIcon name="lock" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Ingresa tu contraseña" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-20 text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-700">{showPassword ? "Ocultar" : "Mostrar"}</button></div></label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-60">{loading ? "Verificando..." : "Ingresar como superadmin"}</button>
        </form>
        <p className="mt-6 text-center text-xs font-medium text-slate-300">¿Eres propietario de una tienda? <Link href="/panel/login" className="font-bold text-violet-300 hover:text-white">Ir al panel del negocio</Link></p>
      </div>
    </main>
  );
}
