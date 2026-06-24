"use client";

import { useCallback, useEffect, useState } from "react";
import { superApi, type GlobalUser } from "@/lib/superadmin-api";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  EMPLOYEE: "Empleado",
};

export default function UsersPage() {
  const [rows, setRows] = useState<GlobalUser[]>([]);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    (targetPage = 1) => {
      superApi
        .users(applied || undefined, targetPage)
        .then((r) => {
          setError("");
          setRows(r.items);
          setPage(r.page);
          setPages(r.pages || 1);
          setTotal(r.total);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
        .finally(() => setLoading(false));
    },
    [applied],
  );
  useEffect(() => {
    load(1);
  }, [load]);

  async function resetPwd(u: GlobalUser) {
    const pwd = prompt(`Nueva contraseña para ${u.email} (mínimo 8 caracteres):`);
    if (!pwd || pwd.length < 8) {
      if (pwd) alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    await superApi.resetUserPassword(u.id, pwd);
    alert("Contraseña actualizada.");
  }
  async function toggle(u: GlobalUser) {
    await superApi.toggleUser(u.id);
    load(page);
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Plataforma</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Usuarios</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">{total} usuarios registrados en la plataforma.</p>
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setApplied(search.trim())}
          placeholder="Nombre o correo" className="h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600" />
        <button onClick={() => setApplied(search.trim())} className="rounded-xl bg-violet-600 px-5 text-sm font-bold text-white">Buscar</button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
              <tr><th className="p-4">Usuario</th><th className="p-4">Empresa</th><th className="p-4">Rol</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((u) => (
                <tr key={u.id} className="text-slate-800">
                  <td className="p-4"><p className="font-bold text-slate-950">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="p-4">{u.company?.name ?? "—"}</td>
                  <td className="p-4"><span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{u.role ? (ROLE_LABELS[u.role] ?? u.role) : "—"}</span></td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {u.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => resetPwd(u)} className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100">Restablecer contraseña</button>
                      <button onClick={() => toggle(u)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${u.isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>
                        {u.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (<tr><td colSpan={5} className="p-10 text-center font-semibold text-slate-600">Sin usuarios.</td></tr>)}
              {loading && (<tr><td colSpan={5} className="p-10 text-center text-slate-500">Cargando...</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">Página {page} de {pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40">Anterior</button>
            <button disabled={page >= pages || loading} onClick={() => load(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </section>
    </div>
  );
}
