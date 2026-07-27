"use client";

import { useEffect, useMemo, useState } from "react";
import { superApi } from "@/lib/superadmin-api";

type Role = "Dueño" | "Cliente";

type Row = {
  id: string;
  nombres: string[];
  telefono: string | null;
  roles: Role[];
  empresas: string[];
};

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

const ROLE_BADGE: Record<Role, string> = {
  Dueño: "bg-violet-100 text-violet-700",
  Cliente: "bg-emerald-100 text-emerald-800",
};

export default function WhatsappSettingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<(typeof ROLE_TABS)[number]>("Todos");

  useEffect(() => {
    Promise.all([superApi.whatsappOwners(), superApi.whatsappCustomers()])
      .then(([owners, customers]) => {
        const source: { nombre: string; telefono: string | null; rol: Role; empresa: string }[] = [
          ...owners.map((o) => ({
            nombre: o.usuario ?? "Sin usuario",
            telefono: o.whatsapp,
            rol: "Dueño" as const,
            empresa: o.companyName,
          })),
          ...customers.map((c) => ({
            nombre: c.cliente,
            telefono: c.telefono,
            rol: "Cliente" as const,
            empresa: c.companyName,
          })),
        ];

        // Un mismo número no debe listarse más de una vez: si aparece como Dueño en
        // una tienda y como Cliente en otra, se combina en una sola fila con ambos roles.
        // Los que no tienen número (null) se muestran todos, cada uno por separado.
        const groups = new Map<string, Row>();
        const withoutPhone: Row[] = [];
        let anonId = 0;

        for (const item of source) {
          const digits = item.telefono?.replace(/\D+/g, "") ?? "";
          if (!digits) {
            withoutPhone.push({
              id: `sin-numero-${anonId++}`,
              nombres: [item.nombre],
              telefono: item.telefono,
              roles: [item.rol],
              empresas: [item.empresa],
            });
            continue;
          }
          const existing = groups.get(digits);
          if (!existing) {
            groups.set(digits, {
              id: digits,
              nombres: [item.nombre],
              telefono: item.telefono,
              roles: [item.rol],
              empresas: [item.empresa],
            });
            continue;
          }
          if (!existing.nombres.includes(item.nombre)) existing.nombres.push(item.nombre);
          if (!existing.roles.includes(item.rol)) existing.roles.push(item.rol);
          if (!existing.empresas.includes(item.empresa)) existing.empresas.push(item.empresa);
        }

        const merged = [...groups.values(), ...withoutPhone];
        setRows(merged.sort((a, b) => a.nombres[0].localeCompare(b.nombres[0])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la lista."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (role !== "Todos" && !r.roles.includes(role)) return false;
      if (!q) return true;
      return (
        r.nombres.some((n) => n.toLowerCase().includes(q)) ||
        r.empresas.some((e) => e.toLowerCase().includes(q)) ||
        (r.telefono ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, role]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Integraciones</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">WhatsApp</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {filtered.length} de {rows.length} registros: dueños y clientes de todas las tiendas, con su número de
          WhatsApp.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa o número"
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
        />
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
              {filtered.map((r) => {
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
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center font-semibold text-slate-600">
                    {rows.length === 0 ? "Aún no hay registros." : "Nada coincide con el filtro."}
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
      </section>
    </div>
  );
}
