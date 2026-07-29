"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { storefrontApi, type SubscriptionView } from "@/lib/api";
import type { StoreBrand } from "@/lib/types";
import { SubscriptionReceipt } from "@/components/receipt/SubscriptionReceipt";
import { downloadReceiptImage } from "@/lib/download-receipt";
import { PayOptions } from "@/components/store/PayOptions";

const MONTH_OPTIONS = [1, 3, 6, 12];

export default function SubscriptionReceiptPage() {
  const { subdomain, id } = useParams<{ subdomain: string; id: string }>();
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
  const canRenew =
    subscription &&
    (subscription.state === "active" || subscription.state === "expiring" || subscription.state === "expired");

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
        {subscription && (
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

      {!error && (!subscription || !store) && (
        <p className="mx-auto max-w-[320px] py-10 text-center text-sm font-medium text-gray-500">Cargando...</p>
      )}

      {subscription && store && (
        <>
          <div id="receipt-print-area" ref={printRef} className="w-fit mx-auto">
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

          {subscription.endsAt && (
            <p className="mx-auto mt-3 max-w-[320px] text-center text-xs font-semibold text-slate-500 print:hidden">
              Vence el{" "}
              {new Date(subscription.endsAt).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {subscription.renewalProofUrl && (
            <p className="mx-auto mt-4 max-w-[320px] rounded-xl bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700 ring-1 ring-amber-200 print:hidden">
              🕒 Tu renovación está en revisión. El negocio te confirmará por WhatsApp.
            </p>
          )}

          {!subscription.renewalProofUrl && canRenew && (
            <div className="mx-auto mt-4 max-w-[320px] print:hidden">
              <RenewalForm
                subdomain={subdomain}
                subscriptionId={subscription.id}
                store={store}
                onSubmitted={(updated) => setSubscription(updated)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RenewalForm({
  subdomain,
  subscriptionId,
  store,
  onSubmitted,
}: {
  subdomain: string;
  subscriptionId: string;
  store: StoreBrand;
  onSubmitted: (sub: SubscriptionView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const hasYape = Boolean(store.yapeQrUrl || store.yapeNumber || store.plinQrUrl || store.plinNumber);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="block w-full rounded-full bg-violet-600 py-3 text-center text-sm font-bold text-white hover:bg-violet-700"
      >
        🔄 Renovar suscripción
      </button>
    );
  }

  async function uploadProof(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("El comprobante debe ser una imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe pesar más de 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const updated = await storefrontApi.submitSubscriptionRenewalProof(subdomain, subscriptionId, months, file);
      onSubmitted(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la renovación.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-black text-slate-900">🔄 Renovar suscripción</p>
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-bold text-slate-600">Duración</span>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500"
        >
          {MONTH_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "mes" : "meses"}
            </option>
          ))}
        </select>
      </label>

      {hasYape ? (
        <div className="mt-3">
          <PayOptions
            yapeQrUrl={store.yapeQrUrl}
            yapeHolderName={store.yapeHolderName}
            yapeNumber={store.yapeNumber}
            plinQrUrl={store.plinQrUrl}
            plinHolderName={store.plinHolderName}
            plinNumber={store.plinNumber}
          />
          <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-center">
            <span className="text-sm font-semibold text-violet-700">{uploading ? "Subiendo..." : "📸 Subir captura del pago"}</span>
            <span className="text-xs text-gray-500">JPG o PNG, máx. 5MB</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadProof(f);
              }}
            />
          </label>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">
          El negocio aún no configuró Yape/Plin. Coordina la renovación por WhatsApp.
        </p>
      )}

      {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">{error}</p>}

      <button onClick={() => setOpen(false)} className="mt-3 block w-full py-1 text-center text-xs font-semibold text-slate-500 hover:text-slate-700">
        Cancelar
      </button>
    </div>
  );
}
