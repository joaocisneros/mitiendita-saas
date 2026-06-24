"use client";

import Image from "next/image";
import { useEffect } from "react";
import { AddToCart } from "@/components/AddToCart";
import { ShareButton } from "@/components/store/ShareButton";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

export function ProductDetailModal({
  product,
  currency,
  subdomain,
  accent = "#7c3aed",
  actionLabel = "Agregar",
  placeholderIcon = "🛒",
  onClose,
}: {
  product: PublicProduct;
  currency: string;
  subdomain: string;
  accent?: string;
  actionLabel?: string;
  placeholderIcon?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex min-h-dvh items-end justify-center bg-slate-950/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`product-title-${product.id}`}
    >
      <div
        className="relative max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-xl font-bold text-slate-700 shadow-md ring-1 ring-slate-200 hover:bg-slate-100"
          aria-label="Cerrar detalle"
        >
          ×
        </button>

        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square min-h-72 overflow-hidden bg-slate-100 md:aspect-auto md:min-h-[520px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-7xl text-slate-300">
                {placeholderIcon}
              </div>
            )}
            {product.isFeatured && (
              <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-sm">
                ⭐ Destacado
              </span>
            )}
          </div>

          <section className="flex flex-col justify-center p-6 sm:p-8 md:min-h-[520px]">
            {product.category && (
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: accent }}>
                {product.category.name}
              </p>
            )}
            <h2 id={`product-title-${product.id}`} className="mt-2 pr-8 text-3xl font-black tracking-tight text-slate-950">
              {product.name}
            </h2>
            <p className="mt-3 text-3xl font-black" style={{ color: accent }}>
              {formatPrice(product.price, currency)}
            </p>
            <p className={`mt-2 text-sm font-bold ${product.inStock ? "text-emerald-700" : "text-red-700"}`}>
              {product.inStock ? `${product.available} disponibles` : "Producto agotado"}
            </p>
            <p className="mt-5 whitespace-pre-line text-sm font-medium leading-6 text-slate-700">
              {product.description || "Sin descripción adicional."}
            </p>

            <div className="mt-7">
              <AddToCart product={product} accent={accent} label={actionLabel} />
              <ShareButton
                title={product.name}
                accent={accent}
                url={`/tienda/${subdomain}/producto/${product.slug}`}
              />
            </div>
            <p className="mt-4 text-center text-xs font-medium text-slate-500">
              El precio y el stock se validarán al confirmar el pedido.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
