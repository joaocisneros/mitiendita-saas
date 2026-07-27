"use client";

import { useState } from "react";
import { Overlay } from "@/components/OrderDetailModal";

const CONTROL =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100";

/** Modal para que el superadmin cree el token de UNA tienda puntual (elige la empresa y sus módulos). */
export function CreateCompanyApiTokenModal({
  companies,
  scopes,
  scopeLabels,
  onClose,
  onCreate,
  onCreated,
}: {
  companies: { id: string; name: string; subdomain: string }[];
  scopes: string[];
  scopeLabels: Record<string, string>;
  onClose: () => void;
  onCreate: (body: { companyId: string; name: string; scopes: string[] }) => Promise<{ token: string; whatsapp: string }>;
  onCreated: () => void;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ token: string; whatsapp: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleScope(scope: string) {
    setSelected((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }
  function toggleAll() {
    setSelected((prev) => (prev.length === scopes.length ? [] : [...scopes]));
  }

  async function submit() {
    setError("");
    if (!companyId) {
      setError("Selecciona una empresa.");
      return;
    }
    if (!name.trim()) {
      setError("Ponle un nombre al token.");
      return;
    }
    if (selected.length === 0) {
      setError("Selecciona al menos un módulo.");
      return;
    }
    setSaving(true);
    try {
      const r = await onCreate({ companyId, name: name.trim(), scopes: selected });
      setResult(r);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el token.");
    } finally {
      setSaving(false);
    }
  }

  async function copyToken() {
    if (!result) return;
    await navigator.clipboard.writeText(result.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <Overlay onClose={onClose}>
        <div className="space-y-4">
          <header>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Token creado</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Cópialo ahora</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {result.whatsapp === "sent"
                ? "Ya se lo enviamos también por WhatsApp a la tienda. Podrás verlo de nuevo cuando quieras desde la lista."
                : "No se pudo enviar por WhatsApp automáticamente — cópialo y compártelo tú mismo (también podrás verlo de nuevo desde la lista)."}
            </p>
          </header>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-mono text-slate-800 ring-1 ring-slate-200">
              {result.token}
            </code>
            <button
              onClick={copyToken}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
          <footer className="flex justify-end border-t border-slate-200 pt-4">
            <button
              onClick={onClose}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
            >
              Listo, cerrar
            </button>
          </footer>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div className="space-y-4 pr-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Nuevo token</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Crear token para una tienda</h2>
        </header>

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-slate-800">Empresa</span>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={`${CONTROL} bg-white`}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.subdomain})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-slate-800">Nombre del token</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sistema de contabilidad"
            className={CONTROL}
          />
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Módulos permitidos</span>
            <button onClick={toggleAll} className="text-xs font-bold text-violet-700 hover:underline">
              {selected.length === scopes.length ? "Quitar todos" : "Seleccionar todo"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {scopes.map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition ${selected.includes(s) ? "bg-violet-50 text-violet-700 ring-violet-300" : "text-slate-700 ring-slate-200 hover:bg-slate-50"}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s)}
                  onChange={() => toggleScope(s)}
                  className="accent-violet-600"
                />
                {scopeLabels[s] ?? s}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || companies.length === 0}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Creando..." : "Crear y enviar por WhatsApp"}
          </button>
        </footer>
      </div>
    </Overlay>
  );
}
