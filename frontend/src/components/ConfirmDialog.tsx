"use client";

import { Overlay } from "@/components/OrderDetailModal";

/** Reemplaza confirm()/alert() nativos del navegador por un modal con el estilo del sistema. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Overlay onClose={onCancel} size="default">
      <div className="space-y-4 pr-6">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="text-sm font-medium text-slate-600">{message}</p>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"}`}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </Overlay>
  );
}
