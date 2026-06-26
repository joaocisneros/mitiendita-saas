"use client";

import { useState } from "react";
import { SubscribeModal } from "@/components/store/SubscribeModal";

/** Botón de un plan digital: abre el modal de suscripción. */
export function SubscribeButton({
  subdomain,
  storeName,
  planName,
  productId,
  accent,
  whatsappNumber,
  actionLabel,
  price,
  currency,
  yapeQrUrl,
  yapeHolderName,
  yapeNumber,
}: {
  subdomain: string;
  storeName: string;
  planName: string;
  productId?: string;
  accent: string;
  whatsappNumber: string | null;
  actionLabel: string;
  price?: string | number;
  currency?: string;
  yapeQrUrl?: string | null;
  yapeHolderName?: string | null;
  yapeNumber?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const phoneDigits = whatsappNumber?.replace(/\D/g, "");
  const infoLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Hola ${storeName}, quiero más información sobre el plan *${planName}*.`,
      )}`
    : null;
  return (
    <>
      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ backgroundColor: accent }}
          className="inline-flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          {actionLabel}
        </button>
        {infoLink && (
          <a
            href={infoLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ borderColor: accent, color: accent }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 bg-white py-2.5 text-sm font-bold transition hover:bg-slate-50"
          >
            💬 Más información
          </a>
        )}
      </div>
      {open && (
        <SubscribeModal
          subdomain={subdomain}
          storeName={storeName}
          planName={planName}
          productId={productId}
          accent={accent}
          whatsappNumber={whatsappNumber}
          actionLabel={actionLabel}
          price={price}
          currency={currency}
          yapeQrUrl={yapeQrUrl}
          yapeHolderName={yapeHolderName}
          yapeNumber={yapeNumber}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
