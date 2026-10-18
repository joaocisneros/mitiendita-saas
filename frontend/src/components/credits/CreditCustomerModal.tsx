"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { adminApi, type CreditCustomerDetail, type CreditPayment } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CreditCustomerForm } from "@/components/credits/CreditCustomerForm";
import { CreditPaymentForm, CreditSaleForm, PAYMENT_METHODS } from "@/components/credits/CreditForms";
import { PriceChange } from "@/components/credits/PriceChange";

type Dialog =
  | { type: "sale" }
  | { type: "payment" }
  | { type: "editPayment"; payment: CreditPayment }
  | { type: "edit" }
  | { type: "cancelSale"; id: string; code: string }
  | { type: "deletePayment"; id: string; amount: string }
  | { type: "deleteCustomer" }
  | null;

const SALE_STATUS = {
  pending: { label: "Por pagar", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Pagada", className: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Anulada", className: "bg-slate-200 text-slate-600" },
} as const;

/** Productos visibles por venta antes de "Ver más". */
const VISIBLE_ITEMS = 3;

const VIEWS = [
  ["pending", "Por pagar"],
  ["payment", "Abonos"],
  ["paid", "Historial"],
] as const;
type View = (typeof VIEWS)[number][0];

const EMPTY: Record<View, string> = {
  pending: "No tiene ventas por pagar.",
  payment: "Aún no hay abonos.",
  paid: "Aún no hay ventas pagadas.",
};

/** Por pagar: ventas con saldo · Historial: ventas pagadas · Abonos: pagos. */
const inView = (
  entry: { kind: "sale"; sale: { status: string } } | { kind: "payment" },
  view: View,
) =>
  entry.kind === "payment"
    ? view === "payment"
    : view === (entry.sale.status === "paid" ? "paid" : "pending");

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

/** WhatsApp del Perú: si el número tiene 9 dígitos, se antepone el 51. */
const waPhone = (phone: string) => (phone.length === 9 ? `51${phone}` : phone);

/** Ficha de la clienta: saldo, ventas al crédito, abonos y acciones. */
export function CreditCustomerModal({
  customerId,
  onClose,
  onChanged,
}: {
  customerId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<CreditCustomerDetail | null>(null);
  const [storeName, setStoreName] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("pending");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    adminApi
      .creditCustomer(customerId)
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo cargar la clienta."));
  }, [customerId]);

  useEffect(() => {
    queueMicrotask(load);
    adminApi.settings().then((s) => setStoreName(s.storeName)).catch(() => {});
  }, [load]);

  function afterChange() {
    setDialog(null);
    load();
    onChanged();
  }

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      afterChange();
    } catch (reason) {
      setDialog(null);
      setError(reason instanceof Error ? reason.message : "No se pudo completar la acción.");
    }
  }

  function whatsappStatement(customer: CreditCustomerDetail) {
    const pending = customer.sales.filter((sale) => sale.status === "pending");
    const lines = [
      `Hola ${customer.firstName}, te saluda ${storeName || "tu tienda"} 👋`,
      "",
      "Tu estado de cuenta:",
      ...pending.flatMap((sale) => [
        `• ${dateLabel(sale.soldAt)} — ${sale.items.map((item) => `${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ""}`).join(", ")}: debe ${formatPrice(sale.pending)}`,
      ]),
      "",
      `Total abonado: ${formatPrice(customer.totalPaid)}`,
      `*Saldo pendiente: ${formatPrice(customer.balance)}*`,
      "",
      "¡Gracias por tu preferencia!",
    ];
    window.open(`https://wa.me/${waPhone(customer.phone)}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  }

  if (!data) {
    return (
      <Overlay onClose={onClose} size="wide">
        <p className="p-8 text-center font-semibold text-slate-600">{error || "Cargando..."}</p>
      </Overlay>
    );
  }

  const balance = Number(data.balance);
  const timeline = [
    // Las ventas anuladas no se muestran: ya no forman parte de la cuenta.
    ...data.sales
      .filter((sale) => sale.status !== "cancelled")
      .map((sale) => ({ kind: "sale" as const, date: sale.soldAt, sale })),
    ...data.payments.map((payment) => ({ kind: "payment" as const, date: payment.paidAt, payment })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const visible = timeline.filter((entry) => inView(entry, view));
  const pendingSales = data.sales.filter((sale) => sale.status === "pending").length;
  const lastPayment = data.payments[0];
  const limit = data.creditLimit ? Number(data.creditLimit) : null;
  const initials = `${data.firstName[0] ?? ""}${data.lastName[0] ?? ""}`.toUpperCase();

  return (
    <>
      <Overlay onClose={onClose} size="wide">
        <div className="space-y-5">
          <header className="flex flex-wrap items-start gap-4 pr-10">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white shadow-md shadow-violet-200">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-slate-950">{data.fullName}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${balance > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{balance > 0 ? "Con deuda" : "Al día"}</span>
                {!data.isActive && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">Inactiva</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-slate-600">
                {data.documentNumber && <span>🪪 DNI {data.documentNumber}</span>}
                <a href={`https://wa.me/${waPhone(data.phone)}`} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">📱 {data.phone}</a>
                <span>📅 Clienta desde {dateLabel(data.createdAt)}</span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sacó" value={formatPrice(data.totalSold)} hint={`${data.sales.filter((sale) => sale.status !== "cancelled").length} venta(s)`} className="bg-slate-50 text-slate-900 ring-slate-200" />
            <Stat label="Abonó" value={formatPrice(data.totalPaid)} hint={`${data.payments.length} abono(s)`} className="bg-emerald-50 text-emerald-900 ring-emerald-200" />
            <Stat label="Debe" value={formatPrice(data.balance)} hint={pendingSales ? `${pendingSales} venta(s) por pagar` : "Sin deudas"} className={balance > 0 ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"} />
            <Stat label="Último abono" value={lastPayment ? formatPrice(lastPayment.amount) : "—"} hint={lastPayment ? dateLabel(lastPayment.paidAt) : "Aún no abona"} className="bg-violet-50 text-violet-900 ring-violet-200" />
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Movimientos</h3>
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {VIEWS.map(([id, label]) => (
                    <button key={id} onClick={() => setView(id)} className={`rounded-lg px-3 py-1 text-xs font-bold ${view === id ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                      {label}
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${view === id ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"}`}>
                        {timeline.filter((entry) => inView(entry, id)).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
          <section className="scroll-hidden max-h-[52vh] overflow-y-auto pr-1 lg:h-[52vh] lg:min-h-[420px]">
            {visible.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-medium text-slate-500">{EMPTY[view]}</p>
            ) : (
              <ol className="space-y-2">
                {visible.map((entry) =>
                  entry.kind === "sale" ? (
                    <li key={`s-${entry.sale.id}`} className={`rounded-xl p-3 ring-1 ${entry.sale.status === "cancelled" ? "bg-slate-50 opacity-70 ring-slate-200" : "bg-white ring-slate-200"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-950">
                          🛍️ Venta {entry.sale.code} <span className="font-semibold text-slate-500">· {dateLabel(entry.sale.soldAt)}</span>
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${SALE_STATUS[entry.sale.status].className}`}>{SALE_STATUS[entry.sale.status].label}</span>
                      </div>
                      <ul className="mt-2.5 space-y-2">
                        {(expanded.has(entry.sale.id) ? entry.sale.items : entry.sale.items.slice(0, VISIBLE_ITEMS)).map((item, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                              {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill sizes="56px" className="object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xl text-slate-300">📦</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                              <p className="text-xs font-medium text-slate-500">
                                {item.variant ? `${item.variant} · ` : ""}{item.quantity} x {formatPrice(item.unitPrice)}
                              </p>
                              <PriceChange price={Number(item.unitPrice)} listPrice={item.listPrice === null || item.listPrice === undefined ? null : Number(item.listPrice)} compact />
                            </div>
                            <span className="shrink-0 text-sm font-black text-slate-900">{formatPrice(item.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                      {entry.sale.items.length > VISIBLE_ITEMS && (
                        <button
                          onClick={() => setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(entry.sale.id)) next.delete(entry.sale.id);
                            else next.add(entry.sale.id);
                            return next;
                          })}
                          className="mt-2 text-xs font-bold text-violet-700 hover:underline"
                        >
                          {expanded.has(entry.sale.id)
                            ? "Ver menos"
                            : `Ver ${entry.sale.items.length - VISIBLE_ITEMS} producto(s) más`}
                        </button>
                      )}
                      {entry.sale.note && <p className="mt-2 text-xs font-medium text-slate-500">📝 {entry.sale.note}</p>}
                      {(entry.sale.items.length > 1 || (entry.sale.status === "pending" && Number(entry.sale.paidAmount) === 0)) && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs font-bold">
                          <span className="text-slate-600">{entry.sale.items.length > 1 && <>Total {formatPrice(entry.sale.total)}</>}</span>
                          {entry.sale.status === "pending" && Number(entry.sale.paidAmount) === 0 && (
                            <button onClick={() => setDialog({ type: "cancelSale", id: entry.sale.id, code: entry.sale.code })} className="text-red-600 hover:underline">Anular</button>
                          )}
                        </div>
                      )}
                    </li>
                  ) : (
                    <li key={`p-${entry.payment.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
                      <p className="text-sm font-bold text-emerald-900">
                        💵 Abono {formatPrice(entry.payment.amount)}
                        <span className="font-semibold text-emerald-700"> · {PAYMENT_METHODS.find((m) => m.id === entry.payment.method)?.label} · {dateLabel(entry.payment.paidAt)} {entry.payment.saleCode ? ` · a ${entry.payment.saleCode}` : ""}</span>
                        {entry.payment.note && <span className="block text-xs font-medium text-emerald-700">📝 {entry.payment.note}</span>}
                      </p>
                      {entry.payment.canDelete && (
                        <span className="flex items-center gap-3 text-xs font-bold">
                          <button onClick={() => setDialog({ type: "editPayment", payment: entry.payment })} className="text-violet-700 hover:underline">Corregir</button>
                          <button onClick={() => setDialog({ type: "deletePayment", id: entry.payment.id, amount: entry.payment.amount })} className="text-red-600 hover:underline">Eliminar</button>
                        </span>
                      )}
                    </li>
                  ),
                )}
              </ol>
            )}
          </section>
            </div>

            <aside className="space-y-4">
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Acciones</h3>
                <button onClick={() => setDialog({ type: "sale" })} disabled={!data.isActive} className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">+ Venta al crédito</button>
                <button onClick={() => setDialog({ type: "payment" })} disabled={balance <= 0} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">+ Registrar abono</button>
                <button onClick={() => whatsappStatement(data)} className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50">Enviar estado por WhatsApp</button>
              </div>

              <div className="space-y-3 rounded-2xl p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Datos de cobro</h3>
                  <button onClick={() => setDialog({ type: "edit" })} className="text-xs font-bold text-violet-700 hover:underline">Editar</button>
                </div>
                <Info label="Dirección" value={data.address} />
                {data.reference && <Info label="Referencia" value={data.reference} />}
                {data.birthday && <Info label="Cumpleaños" value={birthdayLabel(data.birthday)} />}
                {data.note && <Info label="Nota" value={data.note} />}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Límite de crédito</p>
                  {limit === null ? (
                    <p className="text-sm font-semibold text-slate-800">Sin límite</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-800">{formatPrice(balance)} de {formatPrice(limit)}</p>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${balance >= limit ? "bg-red-500" : "bg-violet-600"}`} style={{ width: `${Math.min(100, limit > 0 ? (balance / limit) * 100 : 100)}%` }} />
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => run(() => adminApi.updateCreditCustomer(data.id, { isActive: !data.isActive }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  {data.isActive ? "Desactivar clienta" : "Activar clienta"}
                </button>
                {data.sales.length === 0 && data.payments.length === 0 ? (
                  <button
                    onClick={() => setDialog({ type: "deleteCustomer" })}
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Eliminar clienta
                  </button>
                ) : (
                  data.isActive && (
                    <p className="text-center text-[11px] font-medium leading-4 text-slate-400">
                      Tiene historial de ventas: al desactivarla se oculta de la lista y su historial se conserva.
                    </p>
                  )
                )}
              </div>
            </aside>
          </div>
        </div>
      </Overlay>

      {dialog?.type === "sale" && (
        <CreditSaleForm customerId={data.id} customerName={data.fullName} onClose={() => setDialog(null)} onSaved={afterChange} />
      )}
      {dialog?.type === "payment" && (
        <CreditPaymentForm customerId={data.id} customerName={data.fullName} balance={balance} onClose={() => setDialog(null)} onSaved={afterChange} />
      )}
      {dialog?.type === "editPayment" && (
        <CreditPaymentForm customerId={data.id} customerName={data.fullName} balance={balance} payment={dialog.payment} onClose={() => setDialog(null)} onSaved={afterChange} />
      )}
      {dialog?.type === "edit" && (
        <CreditCustomerForm customer={data} onClose={() => setDialog(null)} onSaved={afterChange} />
      )}
      {dialog?.type === "cancelSale" && (
        <ConfirmDialog
          title={`¿Anular la venta ${dialog.code}?`}
          message="Los productos vuelven al stock y la deuda de esta venta se elimina."
          confirmLabel="Anular venta"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => adminApi.cancelCreditSale(dialog.id))}
        />
      )}
      {dialog?.type === "deleteCustomer" && (
        <ConfirmDialog
          title={`¿Eliminar a ${data.fullName}?`}
          message="Se borrará definitivamente. No tiene ventas ni abonos, así que no se pierde ningún historial."
          confirmLabel="Eliminar clienta"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            setError("");
            try {
              await adminApi.deleteCreditCustomer(data.id);
              onChanged();
              onClose();
            } catch (reason) {
              setDialog(null);
              setError(reason instanceof Error ? reason.message : "No se pudo eliminar a la clienta.");
            }
          }}
        />
      )}
      {dialog?.type === "deletePayment" && (
        <ConfirmDialog
          title="¿Eliminar el último abono?"
          message={`Se quitará el abono de ${formatPrice(dialog.amount)} y el saldo volverá a subir.`}
          confirmLabel="Eliminar abono"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => adminApi.deleteCreditPayment(dialog.id))}
        />
      )}
    </>
  );
}

function Stat({ label, value, hint, className }: { label: string; value: string; hint: string; className: string }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
      <p className="mt-0.5 text-xs font-semibold opacity-70">{hint}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

/** "1995-03-21" → "21 de marzo" (y "🎂 ¡Hoy!" si es su día). */
function birthdayLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("es-PE", { day: "numeric", month: "long" });
  const now = new Date();
  return now.getMonth() + 1 === month && now.getDate() === day ? `${label} · 🎂 ¡Hoy!` : label;
}
