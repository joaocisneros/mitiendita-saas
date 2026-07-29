"use client";

import { useEffect, useRef, useState } from "react";
import { storefrontApi, type AppointmentView } from "@/lib/api";
import type { StoreBrand } from "@/lib/types";
import { AppointmentReceipt } from "./AppointmentReceipt";
import { Overlay } from "@/components/OrderDetailModal";
import { downloadReceiptImage } from "@/lib/download-receipt";

/** Vista previa del comprobante de adelanto de una cita, en modal (sin salir del panel). */
export function AppointmentReceiptModal({
  subdomain,
  id,
  onClose,
}: {
  subdomain: string;
  id: string;
  onClose: () => void;
}) {
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
    <Overlay onClose={onClose}>
      {error && <p className="p-4 text-center text-sm font-semibold text-red-700">{error}</p>}
      {!error && (!appointment || !store) && <p className="p-10 text-center text-sm text-slate-500">Cargando...</p>}
      {appointment && store && (
        <div className="space-y-4">
          <div ref={printRef} className="w-fit mx-auto">
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
              href={`/tienda/${subdomain}/cita/${id}/recibo`}
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
