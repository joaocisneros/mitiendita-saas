"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/admin-api";

export default function PanelLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-500 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur">
            🛍️
          </div>
          <h1 className="text-2xl font-extrabold text-white">MiTiendita</h1>
          <p className="text-sm text-white/80">Panel del negocio</p>
        </div>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-xl"
        >
          <h2 className="text-lg font-bold text-gray-800">Inicia sesión</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Correo
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500"
              placeholder="tucorreo@ejemplo.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500"
              placeholder="••••••••"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
