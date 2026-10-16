"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superApi,
  type SaWhatsappDirectoryRow,
  type SaWhatsappDirectorySummary,
} from "@/lib/superadmin-api";
import { DashboardIcon } from "@/components/DashboardIcon";

const ROLE_TABS = ["Todos", "Dueño", "Cliente", "Crédito"] as const;

/** Muestra todos los números con el mismo formato: +51 999 999 999. */
function formatPhone(raw: string | null): string {
  if (!raw) return "No registrado";
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 9) return raw;
  const local = digits.length > 9 ? digits.slice(-9) : digits;
  const country = digits.length > 9 ? digits.slice(0, digits.length - 9) : "51";
  return `+${country} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** Dígitos listos para armar el enlace wa.me; null si el número no alcanza para ser válido. */
function waDigits(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (/^9\d{8}$/.test(digits)) return `51${digits}`;
  if (/^519\d{8}$/.test(digits)) return digits;
  return null;
}

const STATUS_VIEW = {
  available: { label: "Disponible", tone: "bg-emerald-100 text-emerald-800" },
  incomplete: { label: "Número inválido", tone: "bg-amber-100 text-amber-800" },
  missing: { label: "Sin número", tone: "bg-slate-100 text-slate-600" },
  name_review: { label: "Revisar nombre", tone: "bg-orange-100 text-orange-800" },
  duplicate: { label: "Posible duplicado", tone: "bg-rose-100 text-rose-800" },
} as const;

const ROLE_BADGE: Record<string, string> = {
  Dueño: "bg-violet-100 text-violet-700",
  Cliente: "bg-emerald-100 text-emerald-800",
  "Dueño y cliente": "bg-indigo-100 text-indigo-700",
};

const EMPTY_SUMMARY: SaWhatsappDirectorySummary = {
  total: 0,
  owners: 0,
  customers: 0,
  available: 0,
  needsReview: 0,
};

export default function WhatsappSettingsPage() {
  const [rows, setRows] = useState<SaWhatsappDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

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
          setSummary(r.summary ?? EMPTY_SUMMARY);
        })
        .catch((e) =>
          setError(
            e instanceof Error ? e.message : "No se pudo cargar la lista.",
          ),
        )
        .finally(() => setLoading(false));
    },
    [applied, role],
  );
  useEffect(() => {
    queueMicrotask(() => load(1));
  }, [load]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Integraciones</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">WhatsApp</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Directorio centralizado de dueños y clientes de todas las empresas.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Contactos",
            value: summary.total,
            icon: "customers" as const,
            tone: "bg-violet-100 text-violet-700",
          },
          {
            label: "Dueños",
            value: summary.owners,
            icon: "companies" as const,
            tone: "bg-indigo-100 text-indigo-700",
          },
          {
            label: "Disponibles",
            value: summary.available,
            icon: "whatsapp" as const,
            tone: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Requieren revisión",
            value: summary.needsReview,
            icon: "flag" as const,
            tone: "bg-amber-100 text-amber-700",
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {item.value}
                </p>
              </div>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}
              >
                <DashboardIcon name={item.icon} className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setApplied(search.trim())}
          placeholder="Buscar por nombre, empresa o número"
          className="h-10 min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
        />
        <button
          onClick={() => setApplied(search.trim())}
          className="h-10 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700"
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
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-sm">
            <colgroup>
              <col className="w-[23%]" />
              <col className="w-[24%]" />
              <col className="w-[11%]" />
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr>
                <th className="p-4">Contacto</th>
                <th className="p-4">Empresa</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => {
                const digits = waDigits(r.telefono);
                const status = STATUS_VIEW[r.status];
                return (
                  <tr key={r.id} className="text-slate-800">
                    <td className="p-4 font-bold text-slate-950">
                      <span className="block truncate">{r.nombre}</span>
                      {r.duplicateNames.length > 0 && (
                        // Un número = una fila con el nombre más completo; los demás
                        // nombres con que se registró quedan en la etiqueta (al pasar el mouse).
                        <span
                          className="mt-1 inline-block cursor-help rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                          title={`También registrado como: ${r.duplicateNames.join(", ")}`}
                        >
                          Unificado · +{r.duplicateNames.length} {r.duplicateNames.length === 1 ? "nombre" : "nombres"}
                        </span>
                      )}
                    </td>
                    <td className="truncate p-4">{r.empresa}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_BADGE[r.rol]}`}
                      >
                        {r.rol}
                      </span>
                      {r.credito && (
                        <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800" title="Registrada en el módulo Créditos">
                          Crédito
                        </span>
                      )}
                    </td>
                    <td className="truncate p-4 font-semibold text-slate-800">
                      {formatPhone(r.telefono)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {digits ? (
                        <a
                          href={`https://wa.me/${digits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Abrir WhatsApp
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center font-semibold text-slate-600"
                  >
                    {total === 0
                      ? "Aún no hay registros."
                      : "Nada coincide con el filtro."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">
            {total} registros · Página {page} de {pages}
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
