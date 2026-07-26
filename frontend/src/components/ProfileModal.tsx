"use client";

import { useEffect, useState } from "react";

export interface ProfileDraft {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

/**
 * Modal "Editar perfil" reutilizable (dueño y superadmin).
 * Permite cambiar el nombre y/o la contraseña. El correo es de solo lectura.
 */
export function ProfileModal({
  name,
  email,
  onSave,
  onClose,
  onLogout,
}: {
  name?: string;
  email: string;
  onSave: (draft: ProfileDraft) => Promise<void>;
  onClose: () => void;
  onLogout?: () => void;
}) {
  const [displayName, setDisplayName] = useState(name ?? "");
  const [tab, setTab] = useState<"perfil" | "password">("perfil");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setError("");
    const draft: ProfileDraft = {};
    if (displayName.trim() && displayName.trim() !== (name ?? "")) {
      if (displayName.trim().length < 2) {
        setError("El nombre debe tener al menos 2 caracteres.");
        return;
      }
      draft.name = displayName.trim();
    }
    const wantsPassword = Boolean(current || next || confirm);
    if (wantsPassword) {
      if (!current) {
        setError("Ingresa tu contraseña actual.");
        return;
      }
      if (next.length < 8) {
        setError("La nueva contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (next !== confirm) {
        setError("La nueva contraseña y su confirmación no coinciden.");
        return;
      }
      draft.currentPassword = current;
      draft.newPassword = next;
    }
    if (!draft.name && !draft.newPassword) {
      setError("No hay cambios para guardar.");
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      // Muestra el mensaje de éxito un instante y cierra el modal.
      setTimeout(() => onClose(), 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-950">Mi perfil</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" aria-label="Cerrar">✕</button>
        </div>

        {/* Identidad compacta: avatar + correo (no editable) */}
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-base font-black text-white">
            {(displayName || email || "U").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{displayName || "Tu cuenta"}</p>
            <p className="truncate text-xs font-medium text-slate-500">🔒 {email || "—"}</p>
          </div>
        </div>

        {/* Pestañas: Perfil / Contraseña */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => { setTab("perfil"); setError(""); }}
            className={`rounded-lg py-1.5 text-sm font-black transition ${tab === "perfil" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
          >
            Perfil
          </button>
          <button
            onClick={() => { setTab("password"); setError(""); }}
            className={`rounded-lg py-1.5 text-sm font-black transition ${tab === "password" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
          >
            Contraseña
          </button>
        </div>

        {tab === "perfil" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">Nombre</span>
            <input value={displayName} onChange={(e) => { setDisplayName(e.target.value); setOk(false); }} className="pm-input" placeholder="Tu nombre" autoComplete="off" name="mt-profile-name" />
          </label>
        ) : (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Contraseña actual</span>
              <input type="password" value={current} onChange={(e) => { setCurrent(e.target.value); setOk(false); }} className="pm-input" placeholder="Tu contraseña actual" autoComplete="current-password" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Nueva contraseña</span>
              <input type="password" value={next} onChange={(e) => { setNext(e.target.value); setOk(false); }} className="pm-input" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-700">Repite la nueva contraseña</span>
              <input type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setOk(false); }} className="pm-input" placeholder="Vuelve a escribirla" autoComplete="new-password" />
            </label>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}
        {ok && <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-sm font-semibold text-emerald-700">✅ Cambios guardados.</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">{saving ? "Guardando..." : "Guardar cambios"}</button>
        </div>

        {onLogout && (
          <button onClick={onLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">
            🚪 Cerrar sesión
          </button>
        )}
        <style>{`.pm-input{height:2.6rem;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;background:#fff;padding:0 .8rem;font-size:.95rem;color:#0f172a;outline:none}.pm-input:focus{border-color:#7c3aed;box-shadow:0 0 0 3px #ede9fe}`}</style>
      </div>
    </div>
  );
}
