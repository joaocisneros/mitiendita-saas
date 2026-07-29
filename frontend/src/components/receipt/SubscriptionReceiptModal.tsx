"use client";

import { useEffect, useRef, useState } from "react";
import { storefrontApi, type SubscriptionView } from "@/lib/api";
import type { StoreBrand } from "@/lib/types";
import { SubscriptionReceipt } from "./SubscriptionReceipt";
import { Overlay } from "@/components/OrderDetailModal";
import { downloadReceiptImage } from "@/lib/download-receipt";

/** Vista previa del comprobante de una suscripción, en modal (sin salir del panel). */
export function SubscriptionReceiptModal({
  subdomain,
  id,
  onClose,
}: {
  subdomain: string;
  id: string;
  onClose: () => void;
}) {
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [store, setStore] = useState<StoreBrand | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([storefrontApi.getSubscription(subdomain, id), storefrontApi.getStore(subdomain)])
      .then(([sub, s]) => {
        setSubscription(sub);
        setStore(s.store);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [subdomain, id]);

  const code = subscription?.publicCode ?? subscription?.id.slice(0, 8).toUpperCase() ?? "";

  return (
    <Overlay onClose={onClose}>
      {error && <p className="p-4 text-center text-sm font-semibold text-red-700">{error}</p>}
      {!error && (!subscription || !store) && <p className="p-10 text-center text-sm text-slate-500">Cargando...</p>}
      {subscription && store && (
        <div className="space-y-4">
          <div ref={printRef} className="w-fit mx-auto">
            <SubscriptionReceipt
              store={{ name: store.name, logoUrl: store.logoUrl, address: store.storeAddress }}
              subscription={{
                code,
                createdAt: subscription.createdAt ?? new Date().toISOString(),
                customerName: subscription.customerName ?? "",
                customerPhone: subscription.customerPhone ?? "",
                planName: subscription.planName,
                price: subscription.price ?? null,
                currency: store.currency,
                status: subscription.state ?? subscription.status,
                startsAt: subscription.startsAt,
                endsAt: subscription.endsAt,
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={async () => {
                if (!printRef.current) return;
                setDownloading(true);
                try {
                  await downloadReceiptImage(printRef.current, `comprobante-${code}.png`);
                } finally {
                  setDownloading(false);
                }
              }}
              className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-60"
            >
              {downloading ? "Generando..." : "Descargar"}
            </button>
            <a
              href={`/tienda/${subdomain}/suscripcion/${id}/recibo`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-700"
            >
              Abrir para imprimir ↗
            </a>
          </div>
        </div>
      )}
    </Overlay>
  );
}
