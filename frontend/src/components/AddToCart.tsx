"use client";

import { useCart } from "@/lib/cart-context";
import type { PublicProduct } from "@/lib/types";

export function AddToCart({
  product,
  accent = "#7c3aed",
  label = "Agregar",
}: {
  product: PublicProduct;
  accent?: string;
  label?: string;
}) {
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
      <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-100 px-2 py-1">
        <button
          onClick={() => setQty(product.id, inCart.quantity - 1)}
          style={{ color: accent }}
          className="h-8 w-8 rounded-md bg-white text-lg font-bold shadow-sm"
          aria-label="Quitar uno"
        >
          −
        </button>
        <span className="font-bold" style={{ color: accent }}>
          {inCart.quantity}
        </span>
        <button
          onClick={() =>
            setQty(product.id, Math.min(product.available, inCart.quantity + 1))
          }
          disabled={inCart.quantity >= product.available}
          style={{ color: accent }}
          className="h-8 w-8 rounded-md bg-white text-lg font-bold shadow-sm disabled:opacity-40"
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
      style={{ backgroundColor: accent }}
      className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90"
    >
      {label}
    </button>
  );
}
