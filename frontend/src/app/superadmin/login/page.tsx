"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { superApi } from "@/lib/superadmin-api";

export default function SuperLogin() {
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
      await superApi.login(email.trim(), password);
      router.push("/superadmin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-extrabold text-white">
          MiTiendita <span className="text-violet-400">ADMIN</span>
        </h1>
        <p className="mb-6 text-center text-sm text-gray-400">
          Panel de la plataforma
        </p>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Contraseña"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500"
          />
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
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
