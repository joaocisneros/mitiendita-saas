"use client";

import { useEffect, useState } from "react";
import {
  superApi,
  type GlobalStats,
  type Plan,
  type SaCompany,
} from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";

export default function SuperDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<SaCompany[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  function load() {
    superApi.stats().then(setStats).catch((e) => setError(e.message));
    superApi.companies(search || undefined).then(setCompanies).catch(() => {});
    superApi.plans().then(setPlans).catch(() => {});
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(c: SaCompany) {
    if (c.status === "active") await superApi.suspend(c.id);
    else await superApi.activate(c.id);
    load();
  }
  async function changePlan(c: SaCompany, planId: number) {
    await superApi.assignPlan(c.id, planId);
    load();
  }

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-extrabold">Dashboard global</h1>
      {error && <p className="text-red-400">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Empresas" value={String(stats.totalCompanies)} />
          <Stat label="Activas" value={String(stats.activeCompanies)} />
          <Stat label="Suspendidas" value={String(stats.suspendedCompanies)} />
          <Stat label="Pedidos" value={String(stats.totalOrders)} />
          <Stat label="Volumen bruto" value={formatPrice(stats.grossVolume)} accent />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Buscar empresa..."
          className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-white placeholder-gray-400 outline-none"
        />
        <button onClick={load} className="rounded-lg bg-violet-600 px-4 font-semibold">
          Buscar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/5 ring-1 ring-white/10">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400">
            <tr>
              <th className="p-3">Empresa</th>
              <th className="p-3">Subdominio</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Pedidos</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {companies.slice(0, 50).map((c) => (
              <tr key={c.id} className="border-t border-white/10">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-gray-400">{c.subdomain}</td>
                <td className="p-3">
                  <span className={c.status === "active" ? "text-green-400" : "text-red-400"}>
                    {c.status === "active" ? "Activa" : "Suspendida"}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={plans.find((p) => p.name === c.plan)?.id ?? ""}
                    onChange={(e) => changePlan(c, Number(e.target.value))}
                    className="rounded bg-white/10 px-2 py-1"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id} className="text-black">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">{c.orders}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggle(c)}
                    className={`rounded px-3 py-1 text-xs font-semibold ${
                      c.status === "active"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    {c.status === "active" ? "Suspender" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ring-white/10 ${accent ? "bg-violet-600" : "bg-white/5"}`}>
      <p className="text-xs text-gray-300">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}
