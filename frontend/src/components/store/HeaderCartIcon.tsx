"use client";

import { useCart } from "@/lib/cart-context";

/** Ícono de carrito con contador, para el header. Abre el drawer del carrito. */
export function HeaderCartIcon() {
  const { count, openCart } = useCart();
  return (
    <button
      onClick={openCart}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/30"
      aria-label="Ver carrito"
    >
      🛒
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-black text-slate-900 shadow">
          {count}
        </span>
      )}
    </button>
  );
}
