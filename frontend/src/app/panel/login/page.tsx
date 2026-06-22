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
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-extrabold">
          Mi<span className="text-violet-600">Tiendita</span>
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Panel del negocio
        </p>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
        >
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
