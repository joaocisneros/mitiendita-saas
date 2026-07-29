"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminApi, getAccess, type AdminOrderDetail, type StoreSettings } from "@/lib/admin-api";
import { OrderReceipt } from "@/components/receipt/OrderReceipt";
import { downloadReceiptImage } from "@/lib/download-receipt";

export default function AdminOrderReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAccess()) {
      router.replace("/panel/login");
      return;
    }
    Promise.all([adminApi.order(id), adminApi.settings()])
      .then(([o, s]) => {
        setOrder(o);
        setSettings(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [id, router]);

  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="mx-auto mb-4 flex w-full max-w-[320px] items-center justify-between print:hidden">
        <Link href="/panel/pedidos" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Volver
        </Link>
        {order && (
          <div className="flex gap-2">
            <button
              disabled={downloading}
              onClick={async () => {
                if (!printRef.current) return;
                setDownloading(true);
                try {
                  await downloadReceiptImage(printRef.current, `recibo-${order.publicCode}.png`);
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

      {!error && (!order || !settings) && (
        <p className="mx-auto max-w-[320px] py-10 text-center text-sm font-medium text-slate-500">Cargando...</p>
      )}

      {order && settings && (
        <div id="receipt-print-area" ref={printRef} className="w-fit mx-auto">
          <OrderReceipt
            store={{ name: settings.storeName, logoUrl: settings.logoUrl, address: settings.storeAddress }}
            order={{
              code: order.publicCode,
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
