"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { storefrontApi, type AppointmentView } from "@/lib/api";
import type { StoreBrand } from "@/lib/types";
import { AppointmentReceipt } from "@/components/receipt/AppointmentReceipt";
import { downloadReceiptImage } from "@/lib/download-receipt";

export default function AppointmentReceiptPage() {
  const { subdomain, id } = useParams<{ subdomain: string; id: string }>();
  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [store, setStore] = useState<StoreBrand | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([storefrontApi.getAppointment(subdomain, id), storefrontApi.getStore(subdomain)])
      .then(([a, s]) => {
        setAppointment(a);
        setStore(s.store);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [subdomain, id]);

  const code = appointment?.publicCode ?? appointment?.id.slice(0, 8).toUpperCase() ?? "";

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
        {appointment && (
          <div className="flex gap-2">
            <button
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

      {!error && (!appointment || !store) && (
        <p className="mx-auto max-w-[320px] py-10 text-center text-sm font-medium text-gray-500">Cargando...</p>
      )}

      {appointment && store && (
        <div id="receipt-print-area" ref={printRef} className="w-fit mx-auto">
          <AppointmentReceipt
            store={{ name: store.name, logoUrl: store.logoUrl, address: store.storeAddress }}
            appointment={{
              code,
              createdAt: appointment.createdAt ?? new Date().toISOString(),
              customerName: appointment.customerName ?? "",
              customerPhone: appointment.customerPhone ?? "",
              serviceName: appointment.serviceName,
              preferredAt: appointment.preferredAt,
              advanceAmount: appointment.advanceAmount ?? "0",
              currency: store.currency,
              paymentStatus: appointment.paymentStatus ?? "pending",
            }}
          />
        </div>
      )}
    </div>
  );
}
