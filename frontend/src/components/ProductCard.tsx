"use client";

import Image from "next/image";
import { useState } from "react";
import { AddToCart } from "@/components/AddToCart";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

export function ProductCard({
  product,
  currency,
  subdomain,
  accent,
  actionLabel,
  placeholderIcon = "🛒",
}: {
  product: PublicProduct;
  currency: string;
  subdomain: string;
  accent?: string;
  actionLabel?: string;
  placeholderIcon?: string;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="relative block aspect-square w-full overflow-hidden bg-slate-100 text-left"
          aria-label={`Ver detalle de ${product.name}`}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-5xl text-slate-300">
              {placeholderIcon}
            </span>
          )}
          {product.isFeatured && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-amber-950 shadow-sm">
              ⭐ Destacado
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-black text-slate-700 backdrop-blur-[1px]">
              Agotado
            </span>
          )}
        </button>

        <div className="flex flex-1 flex-col p-3">
          {product.category && (
            <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {product.category.name}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="line-clamp-2 min-h-[2.5rem] text-left text-sm font-semibold leading-tight text-slate-800 transition hover:text-slate-950"
          >
            {product.name}
          </button>
          <p className="mt-1 text-lg font-black tracking-tight" style={{ color: accent }}>
            {formatPrice(product.price, currency)}
          </p>
          <div className="mt-auto pt-2">
            <AddToCart product={product} accent={accent} label={actionLabel} />
          </div>
        </div>
      </article>

      {showDetail && (
        <ProductDetailModal
          product={product}
          currency={currency}
          subdomain={subdomain}
          accent={accent}
          actionLabel={actionLabel}
          placeholderIcon={placeholderIcon}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
