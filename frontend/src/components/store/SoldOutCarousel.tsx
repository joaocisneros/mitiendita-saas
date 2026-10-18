"use client";

import { useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";

/**
 * "Agotados por ahora": los productos sin stock salen del catálogo y se muestran
 * aquí, en un carrusel que se mueve solo (se detiene al pasar el mouse).
 */
export function SoldOutCarousel({
  products,
  subdomain,
  currency,
  accent,
}: {
  products: PublicProduct[];
  subdomain: string;
  currency: string;
  accent: string;
}) {
  const [open, setOpen] = useState<PublicProduct | null>(null);
  if (products.length === 0) return null;
  // Con pocos productos no hace falta moverlos; con más, la lista se repite para el giro continuo.
  const moving = products.length >= 4;
  const track = moving ? [...products, ...products] : products;
  const seconds = Math.max(20, products.length * 5);

  return (
    <section className="mt-10" aria-labelledby="agotados-titulo">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 id="agotados-titulo" className="text-lg font-black text-slate-900">
            Agotados por ahora
          </h2>
          <p className="text-xs font-medium text-slate-500">Pronto pueden volver. Escríbenos si te interesa alguno.</p>
        </div>
      </div>

      <div className="soldout-viewport relative overflow-hidden rounded-2xl bg-white/70 py-3 ring-1 ring-slate-200">
        <div
          className={`flex w-max gap-3 px-3 ${moving ? "soldout-track" : ""}`}
          style={moving ? { animationDuration: `${seconds}s` } : undefined}
        >
          {track.map((p, index) => (
            <button
              type="button"
              key={`${p.id}-${index}`}
              onClick={() => setOpen(p)}
              className="group w-36 shrink-0 overflow-hidden rounded-xl bg-white text-left ring-1 ring-slate-200 transition hover:ring-slate-300 sm:w-44"
              aria-hidden={index >= products.length ? true : undefined}
              tabIndex={index >= products.length ? -1 : undefined}
            >
              <div className="relative aspect-square bg-slate-100">
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt={p.name} fill sizes="176px" className="object-cover opacity-70 grayscale transition group-hover:grayscale-0" />
                ) : (
                  <span className="flex h-full items-center justify-center text-3xl text-slate-300">🛍️</span>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-black text-white">
                  Agotado
                </span>
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 min-h-[2.25rem] text-xs font-bold leading-snug text-slate-800">{p.name}</p>
                <p className="mt-1 text-sm font-black" style={{ color: accent }}>
                  {formatPrice(p.price, currency)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <ProductDetailModal product={open} currency={currency} subdomain={subdomain} accent={accent} onClose={() => setOpen(null)} />
      )}

      <style>{`
        @keyframes soldout-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .soldout-track { animation: soldout-scroll linear infinite; }
        .soldout-viewport:hover .soldout-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .soldout-track { animation: none; } }
      `}</style>
    </section>
  );
}
