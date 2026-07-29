import { formatPrice } from "@/lib/format";

interface ReceiptStore {
  name: string;
  logoUrl: string | null;
  address: string | null;
}

interface SubscriptionReceiptData {
  code: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  planName: string;
  price: string | null;
  currency: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
}

/** Etiqueta del período a partir de la duración real entre inicio y vencimiento. */
function periodLabel(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt || !endsAt) return "Por definir";
  const months = Math.round(
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / (1000 * 60 * 60 * 24 * 30),
  );
  if (months <= 1) return "Mensual";
  if (months <= 3) return "Trimestral";
  if (months <= 6) return "Semestral";
  if (months >= 11) return "Anual";
  return `${months} meses`;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  active: { label: "Activa", cls: "bg-emerald-100 text-emerald-800" },
  expiring: { label: "Por vencer", cls: "bg-orange-100 text-orange-700" },
  expired: { label: "Vencida", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", cls: "bg-slate-200 text-slate-600" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "•";
}

/** Comprobante de pago de una suscripción (no fiscal). */
export function SubscriptionReceipt({ store, subscription }: { store: ReceiptStore; subscription: SubscriptionReceiptData }) {
  const badge = STATUS_BADGE[subscription.status] ?? { label: subscription.status, cls: "bg-slate-100 text-slate-600" };

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-2xl bg-white px-5 py-6 shadow-[0_18px_34px_-18px_rgba(33,28,46,0.25)] ring-1 ring-slate-200">
      <div className="flex items-center gap-2.5">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-black text-white">
            {initials(store.name)}
          </span>
        )}
        <span className="truncate text-[15px] font-black tracking-tight text-slate-950">{store.name}</span>
      </div>
      {store.address && <p className="ml-9 mt-0.5 text-[11px] text-slate-400">{store.address}</p>}

      <span className="mt-3 inline-block rounded-md bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
        Comprobante de suscripción
      </span>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500">
        <span>{subscription.code}</span>
        <span>{new Date(subscription.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <div>
        <p className="text-sm font-bold text-slate-900">{subscription.customerName}</p>
        <p className="font-mono text-xs text-slate-500">{subscription.customerPhone}</p>
      </div>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Plan</span>
          <span className="text-right font-semibold text-slate-900">{subscription.planName}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Periodo</span>
          <span className="text-right font-semibold text-slate-900">{periodLabel(subscription.startsAt, subscription.endsAt)}</span>
        </div>
      </div>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <div className="text-center">
        {subscription.price ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Monto pagado</p>
            <p className="my-1 font-mono text-2xl font-extrabold text-violet-700 [font-variant-numeric:tabular-nums]">
              {formatPrice(subscription.price, subscription.currency)}
            </p>
          </>
        ) : (
          <span className="inline-block rounded-lg border border-dashed border-slate-300 px-4 py-2 font-mono text-lg text-slate-400">
            S/ — . — —
          </span>
        )}
      </div>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Pago digital (Yape/Plin)</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.cls}`}>{badge.label}</span>
      </div>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-400">
        Este documento no tiene validez tributaria.
        <br />
        No es boleta ni factura electrónica.
      </p>
    </div>
  );
}

export type { SubscriptionReceiptData };
