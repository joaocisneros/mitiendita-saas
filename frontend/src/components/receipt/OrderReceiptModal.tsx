"use client";

import { useEffect, useRef, useState } from "react";
import { storefrontApi, type OrderView } from "@/lib/api";
import type { StoreBrand } from "@/lib/types";
import { OrderReceipt } from "./OrderReceipt";
import { Overlay } from "@/components/OrderDetailModal";
import { downloadReceiptImage } from "@/lib/download-receipt";

/** Vista previa del recibo de un pedido, en modal (sin salir del panel). */
export function OrderReceiptModal({
  subdomain,
  code,
  onClose,
}: {
  subdomain: string;
  code: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [store, setStore] = useState<StoreBrand | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([storefrontApi.getOrder(subdomain, code), storefrontApi.getStore(subdomain)])
      .then(([o, s]) => {
        setOrder(o);
        setStore(s.store);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [subdomain, code]);

  return (
    <Overlay onClose={onClose}>
      {error && <p className="p-4 text-center text-sm font-semibold text-red-700">{error}</p>}
      {!error && (!order || !store) && <p className="p-10 text-center text-sm text-slate-500">Cargando...</p>}
      {order && store && (
        <div className="space-y-4">
          <div ref={printRef} className="w-fit mx-auto">
            <OrderReceipt
              store={{ name: store.name, logoUrl: store.logoUrl, address: store.storeAddress }}
              order={{
                code: order.code,
                createdAt: order.createdAt,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                deliveryMethod: order.deliveryMethod,
                address: order.address,
                reference: order.reference,
                items: order.items,
                subtotal: order.subtotal,
                deliveryFee: order.deliveryFee,
                total: order.total,
                currency: order.currency,
                paymentStatus: order.paymentStatus,
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
                  await downloadReceiptImage(printRef.current, `recibo-${code}.png`);
                } finally {
                  setDownloading(false);
                }
              }}
              className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-60"
            >
              {downloading ? "Generando..." : "Descargar"}
            </button>
            <a
              href={`/tienda/${subdomain}/pedido/${code}/recibo`}
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
