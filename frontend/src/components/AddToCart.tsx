"use client";

import { useCart } from "@/lib/cart-context";
import type { PublicProduct } from "@/lib/types";

export function AddToCart({ product }: { product: PublicProduct }) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((i) => i.productId === product.id);

  if (!product.inStock) {
    return (
      <button
        disabled
        className="mt-2 w-full cursor-not-allowed rounded-lg bg-gray-200 py-2 text-sm font-semibold text-gray-400"
      >
        Sin stock
      </button>
    );
  }

  if (inCart) {
    return (
      <div className="mt-2 flex items-center justify-between rounded-lg bg-violet-50 px-2 py-1">
        <button
          onClick={() => setQty(product.id, inCart.quantity - 1)}
          className="h-8 w-8 rounded-md bg-white text-lg font-bold text-violet-600 shadow-sm"
          aria-label="Quitar uno"
        >
          −
        </button>
        <span className="font-bold text-violet-700">{inCart.quantity}</span>
        <button
          onClick={() =>
            setQty(product.id, Math.min(product.available, inCart.quantity + 1))
          }
          disabled={inCart.quantity >= product.available}
          className="h-8 w-8 rounded-md bg-white text-lg font-bold text-violet-600 shadow-sm disabled:opacity-40"
          aria-label="Agregar uno"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() =>
        add({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          available: product.available,
        })
      }
      className="mt-2 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
    >
      Agregar
    </button>
  );
}
