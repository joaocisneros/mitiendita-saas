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
        className="mt-2 h-11 w-full cursor-not-allowed rounded-xl bg-gray-200 text-sm font-semibold text-gray-400"
      >
        Sin stock
      </button>
    );
  }

  if (inCart) {
    return (
      <div className="mt-2 flex h-11 items-center justify-between rounded-xl bg-slate-100 px-2 py-1 ring-1 ring-slate-200">
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
          sizes: product.sizes,
          colors: product.colors,
          variantStocks: product.variantStocks,
        })
      }
      style={{ backgroundColor: accent }}
      className="mt-2 h-11 w-full rounded-xl text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-110"
    >
      {label}
    </button>
  );
}
