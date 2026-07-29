"use client";

import { useCallback, useEffect, useState } from "react";
import { superApi, type SaWhatsappDirectoryRow } from "@/lib/superadmin-api";

const ROLE_TABS = ["Todos", "Dueño", "Cliente"] as const;

/** Muestra todos los números con el mismo formato: +51 999 999 999. */
function formatPhone(raw: string | null): string {
  if (!raw) return "Sin número";
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 9) return `⚠️ ${raw} (incompleto)`;
  const local = digits.length > 9 ? digits.slice(-9) : digits;
  const country = digits.length > 9 ? digits.slice(0, digits.length - 9) : "51";
  return `+${country} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** Dígitos listos para armar el enlace wa.me; null si el número no alcanza para ser válido. */
function waDigits(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 9) return null;
  return digits.length > 9 ? digits : `51${digits}`;
}

const ROLE_BADGE: Record<string, string> = {
  Dueño: "bg-violet-100 text-violet-700",
  Cliente: "bg-emerald-100 text-emerald-800",
};

export default function WhatsappSettingsPage() {
  const [rows, setRows] = useState<SaWhatsappDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [role, setRole] = useState<(typeof ROLE_TABS)[number]>("Todos");

  const load = useCallback(
    (targetPage = 1) => {
      setLoading(true);
      superApi
        .whatsappDirectory({
          search: applied || undefined,
          role: role === "Todos" ? undefined : role,
          page: targetPage,
          limit: 20,
        })
        .then((r) => {
          setError("");
          setRows(r.items);
          setTotal(r.total);
          setPage(r.page);
          setPages(r.pages || 1);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la lista."))
        .finally(() => setLoading(false));
    },
    [applied, role],
  );
  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Integraciones</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">WhatsApp</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {total} registros: dueños y clientes de todas las tiendas, con su número de WhatsApp.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setApplied(search.trim())}
          placeholder="Buscar por nombre, empresa o número"
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
        />
        <button
          onClick={() => setApplied(search.trim())}
          className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700"
        >
          Buscar
        </button>
        <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setRole(tab)}
              className={`w-24 rounded-lg py-1.5 text-sm font-bold transition ${role === tab ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-sm">
            <colgroup>
              <col className="w-[23%]" />
              <col className="w-[25%]" />
              <col className="w-[11%]" />
              <col className="w-[23%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Empresa</th>
                <th className="p-4">Rol</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => {
                const digits = waDigits(r.telefono);
                return (
                  <tr key={r.id} className="text-slate-800">
                    <td className="truncate p-4 font-bold text-slate-950">{r.nombres.join(" / ")}</td>
                    <td className="truncate p-4">{r.empresas.join(", ")}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {r.roles.map((rol) => (
                          <span
                            key={rol}
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_BADGE[rol]}`}
                          >
                            {rol}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="truncate p-4 font-mono font-semibold text-slate-800">{formatPhone(r.telefono)}</td>
                    <td className="p-4">
                      {digits ? (
                        <a
                          href={`https://wa.me/${digits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Contactar
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center font-semibold text-slate-600">
                    {total === 0 ? "Aún no hay registros." : "Nada coincide con el filtro."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">
            Página {page} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= pages || loading}
              onClick={() => load(page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
