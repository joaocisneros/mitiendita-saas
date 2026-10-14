import { formatPrice } from "@/lib/format";
import { formatReceiptDate, ReceiptRule, ReceiptShell, type ReceiptStore } from "./ReceiptShell";

interface AppointmentReceiptData {
  code: string; createdAt: string; customerName: string; customerPhone: string; serviceName: string;
  preferredAt: string; advanceAmount: string; currency: string; paymentStatus: string;
}

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  proof_submitted: { label: "En revisión", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Recibido", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
};

export function AppointmentReceipt({ store, appointment }: { store: ReceiptStore; appointment: AppointmentReceiptData }) {
  const badge = PAYMENT_BADGE[appointment.paymentStatus] ?? { label: appointment.paymentStatus, cls: "bg-slate-100 text-slate-600" };
  return (
    <ReceiptShell store={store} title="Comprobante de adelanto" code={appointment.code} createdAt={appointment.createdAt} accent="amber">
      <section><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cliente</p><p className="mt-1 text-sm font-bold">{appointment.customerName}</p><p className="font-mono text-[11px] text-slate-500">{appointment.customerPhone}</p></section>
      <ReceiptRule />
      <dl className="space-y-3 text-[11px]">
        <div className="grid grid-cols-[72px_1fr] gap-3"><dt className="font-bold uppercase tracking-wide text-slate-400">Servicio</dt><dd className="text-right font-semibold">{appointment.serviceName}</dd></div>
        <div className="grid grid-cols-[72px_1fr] gap-3"><dt className="font-bold uppercase tracking-wide text-slate-400">Fecha y hora</dt><dd className="text-right font-semibold">{formatReceiptDate(appointment.preferredAt)}</dd></div>
      </dl>
      <ReceiptRule />
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-center"><p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800">Adelanto registrado</p><p className="mt-1 font-mono text-2xl font-black text-violet-700">{formatPrice(appointment.advanceAmount, appointment.currency)}</p></div>
      <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-500">El saldo pendiente se paga en el local al momento de la atención.</p>
      <ReceiptRule />
      <div className="flex items-center justify-between gap-3 text-[11px]"><span className="font-semibold text-slate-500">Pago digital (Yape/Plin)</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span></div>
    </ReceiptShell>
  );
}

export type { AppointmentReceiptData };
