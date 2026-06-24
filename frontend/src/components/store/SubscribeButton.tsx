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
}: {
  subdomain: string;
  storeName: string;
  planName: string;
  productId?: string;
  accent: string;
  whatsappNumber: string | null;
  actionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ backgroundColor: accent }}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      >
        {actionLabel}
      </button>
      {open && (
        <SubscribeModal
          subdomain={subdomain}
          storeName={storeName}
          planName={planName}
          productId={productId}
          accent={accent}
          whatsappNumber={whatsappNumber}
          actionLabel={actionLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
