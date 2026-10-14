import { formatPrice } from "@/lib/format";
import { ReceiptRule, ReceiptShell, type ReceiptStore } from "./ReceiptShell";

interface ReceiptItem { name: string; variant?: string | null; quantity: number; unitPrice?: string; lineTotal: string; }
interface ReceiptData {
  code: string; createdAt: string; customerName: string; customerPhone: string; deliveryMethod?: string;
  address?: string | null; reference?: string | null; items: ReceiptItem[]; subtotal: string;
  deliveryFee: string; total: string; currency: string; paymentStatus: string;
}

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  proof_submitted: { label: "En revisión", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Pagado", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
};

export function OrderReceipt({ store, order }: { store: ReceiptStore; order: ReceiptData }) {
  const badge = PAYMENT_BADGE[order.paymentStatus] ?? { label: order.paymentStatus, cls: "bg-slate-100 text-slate-600" };
  return (
    <ReceiptShell store={store} title="Recibo de venta · No fiscal" code={order.code} createdAt={order.createdAt}>
      <section>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-indigo-700 print:text-black">Cliente</p>
        <p className="mt-1 text-[12px] font-semibold uppercase text-slate-900">{order.customerName}</p>
        <p className="text-[10px]">TELÉFONO: {order.customerPhone}</p>
        <p className="mt-1 text-[10px]"><span className="font-semibold">ENTREGA:</span> {order.deliveryMethod === "delivery" ? "A domicilio" : "Recojo en tienda"}</p>
        {order.deliveryMethod === "delivery" && order.address && (
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{order.address}{order.reference ? ` · Ref.: ${order.reference}` : ""}</p>
        )}
      </section>
      <ReceiptRule />
      <table className="w-full table-fixed border-collapse text-[10px] [font-variant-numeric:tabular-nums]">
        <thead><tr className="text-[8px] font-extrabold uppercase tracking-wide text-slate-400">
          <th className="w-[46%] border-y border-indigo-300 py-1.5 text-left text-indigo-800 print:border-black print:text-black">Descripción</th><th className="w-[12%] border-y border-indigo-300 py-1.5 text-center text-indigo-800 print:border-black print:text-black">Cant.</th>
          <th className="w-[20%] border-y border-indigo-300 py-1.5 text-right text-indigo-800 print:border-black print:text-black">Precio</th><th className="w-[22%] border-y border-indigo-300 py-1.5 text-right text-indigo-800 print:border-black print:text-black">Total</th>
        </tr></thead>
        <tbody>{order.items.map((item, index) => (
          <tr key={`${item.name}-${index}`} className="align-top">
            <td className="py-2 pr-1 font-semibold uppercase leading-tight text-slate-900">{item.name}{item.variant && <span className="mt-0.5 block text-[8px] font-normal normal-case text-slate-500">{item.variant}</span>}</td>
            <td className="py-2 text-center font-mono">{item.quantity}</td>
            <td className="py-2 text-right font-mono">{Number(item.unitPrice ?? Number(item.lineTotal) / item.quantity).toFixed(2)}</td>
            <td className="py-2 text-right font-mono font-semibold text-slate-900">{Number(item.lineTotal).toFixed(2)}</td>
          </tr>
        ))}</tbody>
      </table>
      <ReceiptRule />
      <div className="space-y-1 text-[11px] [font-variant-numeric:tabular-nums]">
        <div className="flex justify-between"><span className="font-medium">Subtotal</span><span className="font-mono">{formatPrice(order.subtotal, order.currency)}</span></div>
        {order.deliveryMethod === "delivery" && <div className="flex justify-between"><span className="font-medium">Envío</span><span className="font-mono">{formatPrice(order.deliveryFee, order.currency)}</span></div>}
        <div className="mt-2 flex items-baseline justify-between border-y border-indigo-300 bg-indigo-50/60 px-1 py-2 print:border-black print:bg-white"><span className="text-[13px] font-bold text-slate-900">TOTAL</span><span className="font-mono text-[18px] font-extrabold text-indigo-700 print:text-black">{formatPrice(order.total, order.currency)}</span></div>
      </div>
      <ReceiptRule />
      <div className="space-y-1 text-[10px]"><div><span className="font-semibold text-slate-800">FORMA DE PAGO:</span> Yape / Plin</div><div className="flex items-center justify-between"><span className="font-semibold text-slate-800">ESTADO:</span><span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold uppercase text-amber-800 print:bg-white print:text-black">{badge.label}</span></div></div>
    </ReceiptShell>
  );
}

export type { ReceiptStore, ReceiptItem, ReceiptData };
