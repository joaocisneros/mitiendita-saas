import { formatPrice } from "@/lib/format";

interface ReceiptStore {
  name: string;
  logoUrl: string | null;
  address: string | null;
}

interface ReceiptItem {
  name: string;
  variant?: string | null;
  quantity: number;
  lineTotal: string;
}

interface ReceiptData {
  code: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod?: string;
  address?: string | null;
  reference?: string | null;
  items: ReceiptItem[];
  subtotal: string;
  deliveryFee: string;
  total: string;
  currency: string;
  paymentStatus: string;
}

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  proof_submitted: { label: "En revisión", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Pagado", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "•";
}

/** Recibo de compra imprimible (no fiscal), estilo boleta angosta de impresora térmica. */
export function OrderReceipt({ store, order }: { store: ReceiptStore; order: ReceiptData }) {
  const badge = PAYMENT_BADGE[order.paymentStatus] ?? { label: order.paymentStatus, cls: "bg-slate-100 text-slate-600" };

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
        Recibo de compra
      </span>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500">
        <span>{order.code}</span>
        <span>{new Date(order.createdAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <div>
        <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
        <p className="font-mono text-xs text-slate-500">{order.customerPhone}</p>
        <p className="mt-1 text-xs font-semibold text-slate-600">
          {order.deliveryMethod === "delivery" ? "🚚 Entrega a domicilio" : "🏪 Recojo en tienda"}
        </p>
        {order.deliveryMethod === "delivery" && order.address && (
          <p className="text-xs text-slate-500">
            📍 {order.address}
            {order.reference ? ` (${order.reference})` : ""}
          </p>
        )}
      </div>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <table className="w-full font-mono text-[13px] [font-variant-numeric:tabular-nums]">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-400" style={{ fontFamily: "inherit" }}>
            <th className="pb-1.5 font-sans">Producto</th>
            <th className="pb-1.5 text-right font-sans">Cant.</th>
            <th className="pb-1.5 text-right font-sans">Importe</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="py-0.5 pr-2 font-sans text-[13px] text-slate-800">
                {item.name}
                {item.variant && <span className="block font-sans text-[10px] text-slate-400">{item.variant}</span>}
              </td>
              <td className="py-0.5 text-right text-slate-600">{item.quantity}</td>
              <td className="py-0.5 text-right text-slate-800">{Number(item.lineTotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-3.5 border-dashed border-slate-300" />

      <div className="space-y-1 font-mono text-[13px] [font-variant-numeric:tabular-nums]">
        <div className="flex justify-between text-slate-500">
          <span className="font-sans">Subtotal</span>
          <span>{formatPrice(order.subtotal, order.currency)}</span>
        </div>
        {order.deliveryMethod === "delivery" && (
          <div className="flex justify-between text-slate-500">
            <span className="font-sans">Delivery</span>
            <span>{formatPrice(order.deliveryFee, order.currency)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between pt-1.5">
          <span className="font-sans text-sm font-bold text-slate-900">Total</span>
          <span className="text-xl font-extrabold text-violet-700">{formatPrice(order.total, order.currency)}</span>
        </div>
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

export type { ReceiptStore, ReceiptItem, ReceiptData };
