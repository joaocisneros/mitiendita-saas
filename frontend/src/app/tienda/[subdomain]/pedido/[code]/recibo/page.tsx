"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { storefrontApi, type OrderView } from "@/lib/api";
import type { StoreBrand } from "@/lib/types";
import { OrderReceipt } from "@/components/receipt/OrderReceipt";
import { downloadReceiptImage } from "@/lib/download-receipt";

export default function OrderReceiptPage() {
  const { subdomain, code } = useParams<{ subdomain: string; code: string }>();
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
    <div className="min-h-dvh bg-gray-50 px-4 py-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="mx-auto mb-4 flex w-full max-w-[320px] items-center justify-between print:hidden">
        <Link href={`/tienda/${subdomain}`} className="text-sm font-semibold text-gray-500 hover:text-gray-800">
          ← Volver a la tienda
        </Link>
        {order && (
          <div className="flex gap-2">
            <button
              disabled={downloading}
              onClick={async () => {
                if (!printRef.current) return;
                setDownloading(true);
                try {
                  await downloadReceiptImage(printRef.current, `recibo-${order.code}.png`);
                } finally {
                  setDownloading(false);
                }
              }}
              className="rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-60"
            >
              {downloading ? "..." : "Descargar"}
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-violet-700"
            >
              Imprimir
            </button>
          </div>
        )}
      </div>

      {error && <p className="mx-auto max-w-[320px] rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{error}</p>}

      {!error && (!order || !store) && (
        <p className="mx-auto max-w-[320px] py-10 text-center text-sm font-medium text-gray-500">Cargando...</p>
      )}

      {order && store && (
        <div id="receipt-print-area" ref={printRef} className="w-fit mx-auto">
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
      )}
    </div>
  );
}
