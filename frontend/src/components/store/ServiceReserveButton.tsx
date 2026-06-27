"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  price,
  currency,
  yapeQrUrl,
  yapeHolderName,
  yapeNumber,
  reservationPaymentMode,
  reservationAdvanceType,
  reservationAdvanceValue,
}: {
  subdomain: string;
  storeName: string;
  serviceName: string;
  productId?: string;
  accent: string;
  whatsappNumber: string | null;
  actionLabel: string;
  price?: string | number;
  currency?: string;
  yapeQrUrl?: string | null;
  yapeHolderName?: string | null;
  yapeNumber?: string | null;
  reservationPaymentMode?: "none" | "optional" | "required" | null;
  reservationAdvanceType?: "fixed" | "percent" | null;
  reservationAdvanceValue?: string | null;
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
      {open &&
        createPortal(
          <ServiceReserveModal
            subdomain={subdomain}
            storeName={storeName}
            serviceName={serviceName}
            productId={productId}
            accent={accent}
            whatsappNumber={whatsappNumber}
            actionLabel={actionLabel}
            price={price}
            currency={currency}
            yapeQrUrl={yapeQrUrl}
            yapeHolderName={yapeHolderName}
            yapeNumber={yapeNumber}
            reservationPaymentMode={reservationPaymentMode}
            reservationAdvanceType={reservationAdvanceType}
            reservationAdvanceValue={reservationAdvanceValue}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}
