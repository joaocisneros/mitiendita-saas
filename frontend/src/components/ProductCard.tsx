"use client";

import Image from "next/image";
import { useState } from "react";
import { AddToCart } from "@/components/AddToCart";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";
import { formatPrice } from "@/lib/format";
import { parseOptions } from "@/lib/product-options";
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
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
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
            <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 text-center text-sm font-black text-slate-700 backdrop-blur-[1px]">
              {product.onHold ? (
                <>
                  Apartado
                  <span className="mt-0.5 px-2 text-[11px] font-semibold text-slate-500">Puede volver si no se confirma un pedido</span>
                </>
              ) : (
                "Agotado"
              )}
            </span>
          )}
        </button>

        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          {product.category && (
            <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {product.category.name}
            </span>
          )}
          <a
            href={`/tienda/${subdomain}/producto/${product.slug}`}
            onClick={(event) => {
              // Ctrl/Cmd + clic o clic central: abre la página del producto en otra pestaña.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              setShowDetail(true);
            }}
            className="line-clamp-2 min-h-[2.75rem] text-left text-[15px] font-bold leading-snug text-slate-900 transition hover:opacity-75"
          >
            {product.name}
          </a>
          <p className="mt-1 text-xl font-black tracking-tight" style={{ color: accent }}>
            {formatPrice(product.price, currency)}
          </p>
          {product.inStock && product.available <= 5 && (
            <span className="mt-1 w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600 ring-1 ring-red-200">
              🔥 {product.available === 1 ? "¡Última unidad!" : `¡Últimas ${product.available}!`}
            </span>
          )}
          <OptionPreview sizes={product.sizes} colors={product.colors} />
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

/** Vista compacta de tallas/colores en la tarjeta (solo muestra, no selecciona). */
function OptionPreview({ sizes, colors }: { sizes?: string | null; colors?: string | null }) {
  const s = parseOptions(sizes);
  const c = parseOptions(colors);
  if (s.length === 0 && c.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {s.slice(0, 3).map((v) => (
        <span key={`s-${v}`} className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{v}</span>
      ))}
      {s.length > 3 && <span className="px-1 text-[10px] font-bold text-slate-400">+{s.length - 3}</span>}
      {c.slice(0, 2).map((v) => (
        <span key={`c-${v}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{v}</span>
      ))}
      {c.length > 2 && <span className="px-1 text-[10px] font-bold text-slate-400">+{c.length - 2}</span>}
    </div>
  );
}
