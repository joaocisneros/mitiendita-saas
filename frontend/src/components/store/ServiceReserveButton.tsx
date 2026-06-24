"use client";

import { useState } from "react";
import { ServiceReserveModal } from "@/components/store/ServiceReserveModal";

/** Botón "Reservar" de una tarjeta de servicio: abre el modal de reserva. */
export function ServiceReserveButton({
  subdomain,
  storeName,
  serviceName,
  productId,
  accent,
  whatsappNumber,
  actionLabel,
}: {
  subdomain: string;
  storeName: string;
  serviceName: string;
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
        className="mt-auto inline-flex w-full items-center justify-center rounded-lg py-2 text-sm font-bold text-white transition hover:opacity-90"
      >
        {actionLabel}
      </button>
      {open && (
        <ServiceReserveModal
          subdomain={subdomain}
          storeName={storeName}
          serviceName={serviceName}
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
