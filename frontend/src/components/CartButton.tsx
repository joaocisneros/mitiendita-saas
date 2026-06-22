"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

/** Botón flotante con el contador del carrito. */
export function CartButton({ subdomain }: { subdomain: string }) {
  const { count } = useCart();
  if (count === 0) return null;

  return (
    <Link
      href={`/tienda/${subdomain}/carrito`}
      className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-violet-700"
    >
      🛒 Ver carrito
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-sm font-bold text-violet-700">
        {count}
      </span>
    </Link>
  );
}
