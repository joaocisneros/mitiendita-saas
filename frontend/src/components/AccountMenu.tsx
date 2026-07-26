"use client";

import { useState } from "react";

/**
 * Avatar del usuario logueado (arriba a la derecha). Al hacer clic despliega
 * un menú con "Editar perfil" y "Cerrar sesión".
 */
export function AccountMenu({
  name,
  email,
  onEditProfile,
  onLogout,
}: {
  name?: string;
  email?: string;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = name || email || "Mi cuenta";
  const initial = (name || email || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 transition hover:bg-slate-50"
        title="Mi cuenta"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">{initial}</span>
        <span className="hidden max-w-[10rem] truncate text-sm font-bold text-slate-800 sm:block">{label}</span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-black text-slate-900">{name || "Mi cuenta"}</p>
              {email && <p className="truncate text-xs font-medium text-slate-500">{email}</p>}
            </div>
            <button
              onClick={() => { setOpen(false); onEditProfile(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              👤 Editar perfil
            </button>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
