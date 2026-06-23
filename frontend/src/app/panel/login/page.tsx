"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import { DashboardIcon } from "@/components/DashboardIcon";

export default function PanelLogin() {
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
      await adminApi.login(email.trim(), password);
      router.push("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600"><DashboardIcon name="store" /></span><span className="text-xl font-black">MiTiendita</span></div>
        <div className="relative max-w-lg">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-violet-300">Tu negocio bajo control</p>
          <h1 className="text-4xl font-black leading-tight">Gestiona pedidos, productos y ventas desde un solo lugar.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Un panel claro y rápido, pensado para que dediques menos tiempo a ordenar mensajes y más tiempo a vender.</p>
        </div>
        <p className="relative text-xs font-medium text-slate-500">Acceso seguro para propietarios y colaboradores</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white"><DashboardIcon name="store" /></div><p className="text-xl font-black text-slate-950">MiTiendita</p></div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Panel del negocio</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Bienvenido de nuevo</h2>
          <p className="mt-2 text-sm font-medium text-slate-600">Ingresa tu correo y contraseña para continuar.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Correo electrónico</span><div className="relative"><DashboardIcon name="mail" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="tucorreo@empresa.com" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100" /></div></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">Contraseña</span><div className="relative"><DashboardIcon name="lock" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Ingresa tu contraseña" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-20 text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-700">{showPassword ? "Ocultar" : "Mostrar"}</button></div></label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-violet-600 font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Ingresando..." : "Ingresar al panel"}</button>
          </form>
          <p className="mt-8 text-center text-sm font-medium text-slate-600">¿Aún no tienes tienda? <Link href="/registro" className="font-bold text-violet-700 hover:underline">Crear cuenta</Link></p>
          <p className="mt-3 text-center text-xs font-medium text-slate-600">¿Administras la plataforma? <Link href="/superadmin/login" className="font-bold text-violet-700 hover:underline">Acceso superadmin</Link></p>
        </div>
      </section>
    </main>
  );
}
