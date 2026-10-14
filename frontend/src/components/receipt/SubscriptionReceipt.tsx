import { formatPrice } from "@/lib/format";
import { formatReceiptDate, ReceiptRule, ReceiptShell, type ReceiptStore } from "./ReceiptShell";

interface SubscriptionReceiptData {
  code: string; createdAt: string; customerName: string; customerPhone: string; planName: string;
  price: string | null; currency: string; status: string; startsAt?: string | null; endsAt?: string | null;
}

function periodLabel(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt || !endsAt) return "Por definir";
  const months = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months <= 1) return "Mensual";
  if (months <= 3) return "Trimestral";
  if (months <= 6) return "Semestral";
  if (months >= 11) return "Anual";
  return `${months} meses`;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  active: { label: "Activa", cls: "bg-emerald-100 text-emerald-800" },
  expiring: { label: "Por vencer", cls: "bg-orange-100 text-orange-700" },
  expired: { label: "Vencida", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", cls: "bg-slate-200 text-slate-600" },
};

export function SubscriptionReceipt({ store, subscription }: { store: ReceiptStore; subscription: SubscriptionReceiptData }) {
  const badge = STATUS_BADGE[subscription.status] ?? { label: subscription.status, cls: "bg-slate-100 text-slate-600" };
  return (
    <ReceiptShell store={store} title="Comprobante de suscripción" code={subscription.code} createdAt={subscription.createdAt}>
      <section><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cliente</p><p className="mt-1 text-sm font-bold">{subscription.customerName}</p><p className="font-mono text-[11px] text-slate-500">{subscription.customerPhone}</p></section>
      <ReceiptRule />
      <dl className="space-y-3 text-[11px]">
        <div className="grid grid-cols-[72px_1fr] gap-3"><dt className="font-bold uppercase tracking-wide text-slate-400">Plan</dt><dd className="text-right font-semibold">{subscription.planName}</dd></div>
        <div className="grid grid-cols-[72px_1fr] gap-3"><dt className="font-bold uppercase tracking-wide text-slate-400">Periodo</dt><dd className="text-right font-semibold">{periodLabel(subscription.startsAt, subscription.endsAt)}</dd></div>
        {subscription.endsAt && <div className="grid grid-cols-[72px_1fr] gap-3"><dt className="font-bold uppercase tracking-wide text-slate-400">Vigencia</dt><dd className="text-right font-semibold">Hasta {formatReceiptDate(subscription.endsAt)}</dd></div>}
      </dl>
      <ReceiptRule />
      <div className="text-center"><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Monto registrado</p><p className="mt-1 font-mono text-2xl font-black text-violet-700">{subscription.price ? formatPrice(subscription.price, subscription.currency) : "—"}</p></div>
      <ReceiptRule />
      <div className="flex items-center justify-between gap-3 text-[11px]"><span className="font-semibold text-slate-500">Estado de suscripción</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span></div>
    </ReceiptShell>
  );
}

export type { SubscriptionReceiptData };
