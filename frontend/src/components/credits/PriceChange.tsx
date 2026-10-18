"use client";

import { formatPrice } from "@/lib/format";

/** "↓ Rebaja de S/ 10 · precio normal S/ 150" (verde) o "↑ Subió…" (ámbar). Nada si es el precio normal. */
export function PriceChange({ price, listPrice, compact = false }: { price: number; listPrice: number | null | undefined; compact?: boolean }) {
  if (listPrice === null || listPrice === undefined || !Number.isFinite(price)) return null;
  const diff = Math.round((price - listPrice) * 100) / 100;
  if (Math.abs(diff) < 0.005) return null;
  const down = diff < 0;
  const tone = down ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200";
  if (compact) {
    return (
      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        precio normal {formatPrice(listPrice)}
        <span className={`rounded-full px-1.5 py-px font-black ring-1 ${tone}`}>
          {down ? `rebaja ${formatPrice(-diff)}` : `subió ${formatPrice(diff)}`}
        </span>
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-lg px-2 py-1 text-xs font-bold ring-1 ${tone}`}>
      {down ? `↓ Rebaja de ${formatPrice(-diff)}` : `↑ Subió ${formatPrice(diff)}`} · precio normal {formatPrice(listPrice)}
    </span>
  );
}
