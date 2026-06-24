"use client";

import { useCart } from "@/lib/cart-context";

/** Aviso flotante (toast) que aparece al agregar al carrito. */
export function CartToast() {
  const { toast } = useCart();
  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-5 z-[70] -translate-x-1/2 transition-all duration-300 ${
        toast ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-xl">
        {toast ?? ""}
      </div>
    </div>
  );
}
