"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { adminApi, type AdminProduct, type CreditPayment, type CreditPaymentMethod } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";
import { Field } from "@/components/credits/CreditCustomerForm";

export const PAYMENT_METHODS: { id: CreditPaymentMethod; label: string }[] = [
  { id: "cash", label: "Efectivo" },
  { id: "yape", label: "Yape" },
  { id: "plin", label: "Plin" },
  { id: "transfer", label: "Transferencia" },
];

const METHOD_ICONS: Record<CreditPaymentMethod, string> = {
  cash: "💵",
  yape: "💜",
  plin: "🩵",
  transfer: "🏦",
};

/** Montos rápidos del abono (solo se muestran los menores a la deuda). */
const QUICK_AMOUNTS = [10, 20, 50, 100];

type Line = {
  key: number;
  product: AdminProduct;
  size: string;
  color: string;
  quantity: number;
  unitPrice: string;
};

const unique = (values: (string | null)[]) =>
  [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];

/** Productos disponibles de una talla/color (o del producto si no tiene variantes). */
function available(product: AdminProduct, size: string, color: string) {
  const rows = product.variantStocks ?? [];
  if (!rows.length) return product.stock - product.reserved;
  const row = rows.find(
    (item) => (item.size ?? "") === size && (item.color ?? "") === color,
  );
  return row ? row.stock - (row.reserved ?? 0) : 0;
}

/** Entrega de uno o varios productos al crédito. Descuenta stock al guardar. */
export function CreditSaleForm({
  customerId,
  customerName,
  onClose,
  onSaved,
}: {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminProduct[]>([]);
  const [searching, setSearching] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Catálogo siempre visible: todos los productos, filtrados al escribir.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearching(true);
      adminApi
        .products({ search: search.trim() || undefined })
        .then((data) => {
          setResults(data.items);
          setPage(1);
          setPages(data.pages);
          setTotalProducts(data.total);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  function loadMore() {
    setSearching(true);
    adminApi
      .products({ search: search.trim() || undefined, page: page + 1 })
      .then((data) => {
        setResults((prev) => [...prev, ...data.items]);
        setPage(page + 1);
        setPages(data.pages);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * line.quantity, 0),
    [lines],
  );
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const inSale = (productId: string) =>
    lines.filter((line) => line.product.id === productId).reduce((sum, line) => sum + line.quantity, 0);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  function addProduct(product: AdminProduct) {
    const rows = product.variantStocks ?? [];
    // Sin tallas/colores: si ya está en la venta, solo suma una unidad.
    const existing = !rows.length && lines.find((line) => line.product.id === product.id);
    if (existing) {
      update(existing.key, { quantity: Math.min(999, existing.quantity + 1) });
      return;
    }
    const first = rows.find((row) => row.stock - (row.reserved ?? 0) > 0) ?? rows[0];
    setLines((prev) => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        product,
        size: first?.size ?? "",
        color: first?.color ?? "",
        quantity: 1,
        unitPrice: Number(product.price).toFixed(2),
      },
    ]);
  }

  async function submit() {
    if (!lines.length) return setError("Agrega al menos un producto.");
    setSaving(true);
    setError("");
    try {
      await adminApi.createCreditSale(customerId, {
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          size: line.size || undefined,
          color: line.color || undefined,
          unitPrice: Number(line.unitPrice),
        })),
        note: note.trim() || undefined,
      });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose} size="wide">
      <div className="flex flex-col gap-4 lg:h-[78vh]">
        <header className="pr-10">
          <h2 className="text-xl font-black text-slate-950">Venta al crédito</h2>
          <p className="text-sm font-medium text-slate-600">Para <b className="text-slate-900">{customerName}</b>. El stock se descuenta al guardar.</p>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Catálogo */}
          <section className="flex min-h-0 flex-col rounded-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-3">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-violet-600">
                <span className="text-sm text-slate-400">🔍</span>
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar producto por nombre..."
                  className="min-w-0 flex-1 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="scroll-hidden max-h-[50vh] min-h-0 flex-1 overflow-y-auto lg:max-h-none">
              {searching && results.length === 0 ? (
                <p className="p-6 text-center text-sm font-medium text-slate-500">Cargando productos...</p>
              ) : results.length === 0 ? (
                <p className="p-6 text-center text-sm font-medium text-slate-500">No se encontraron productos.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((product) => {
                    const stock = product.stock - product.reserved;
                    const added = inSale(product.id);
                    return (
                      <li key={product.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Thumb src={product.imageUrl} alt={product.name} size="h-12 w-12" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                          <p className={`text-xs font-semibold ${stock > 0 ? "text-slate-500" : "text-red-600"}`}>
                            {stock > 0 ? `${stock} disponibles` : "Sin stock"}
                            {added > 0 && <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-700">{added} en la venta</span>}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-slate-900">{formatPrice(product.price)}</span>
                        <button
                          type="button"
                          disabled={stock <= 0}
                          onClick={() => addProduct(product)}
                          className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:bg-slate-300"
                        >
                          + Agregar
                        </button>
                      </li>
                    );
                  })}
                  {page < pages && (
                    <li className="p-3 text-center">
                      <button type="button" disabled={searching} onClick={loadMore} className="rounded-lg px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-60">
                        {searching ? "Cargando..." : `Ver más productos (${results.length} de ${totalProducts})`}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </section>

          {/* Resumen de la venta */}
          <section className="flex min-h-0 flex-col rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-black text-slate-900">Productos de la venta</h3>
              <span className="text-xs font-bold text-slate-500">{units} unidad(es)</span>
            </div>
            <div className="scroll-hidden max-h-[40vh] min-h-0 flex-1 space-y-2 overflow-y-auto p-3 lg:max-h-none">
              {lines.length === 0 ? (
                <div className="flex h-full min-h-32 flex-col items-center justify-center text-center">
                  <span className="text-3xl">🛍️</span>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Agrega productos desde la lista.</p>
                </div>
              ) : (
                lines.map((line) => {
                  const rows = line.product.variantStocks ?? [];
                  const sizes = unique(rows.map((row) => row.size));
                  const colors = unique(rows.filter((row) => !line.size || (row.size ?? "") === line.size).map((row) => row.color));
                  const stock = available(line.product, line.size, line.color);
                  const short = stock < line.quantity;
                  return (
                    <div key={line.key} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
                      <div className="flex items-start gap-2.5">
                        <Thumb src={line.product.imageUrl} alt={line.product.name} size="h-10 w-10" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-950">{line.product.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {sizes.length > 0 && (
                              <MiniSelect value={line.size} options={sizes} label="Talla" onChange={(size) => {
                                const match = rows.find((row) => (row.size ?? "") === size && (row.color ?? "") === line.color)
                                  ?? rows.find((row) => (row.size ?? "") === size);
                                update(line.key, { size, color: match?.color ?? "" });
                              }} />
                            )}
                            {colors.length > 0 && (
                              <MiniSelect value={line.color} options={colors} label="Color" onChange={(color) => update(line.key, { color })} />
                            )}
                            <span className={`text-[11px] font-semibold ${short ? "text-red-600" : "text-slate-400"}`}>
                              {short ? `Solo ${Math.max(0, stock)} disp.` : `${stock} disp.`}
                            </span>
                          </div>
                        </div>
                        <button type="button" onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))} className="text-lg font-bold leading-none text-slate-400 hover:text-red-600" aria-label="Quitar">×</button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-8 items-center overflow-hidden rounded-lg ring-1 ring-slate-300">
                          <button type="button" onClick={() => update(line.key, { quantity: Math.max(1, line.quantity - 1) })} className="h-full w-7 font-bold text-slate-600 hover:bg-slate-100">−</button>
                          <input
                            inputMode="numeric"
                            value={line.quantity}
                            onChange={(event) => update(line.key, { quantity: Math.min(999, Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1)) })}
                            className="h-full w-9 text-center text-sm font-bold text-slate-900 outline-none"
                          />
                          <button type="button" onClick={() => update(line.key, { quantity: Math.min(999, line.quantity + 1) })} className="h-full w-7 font-bold text-slate-600 hover:bg-slate-100">+</button>
                        </div>
                        <span className="text-xs font-bold text-slate-400">×</span>
                        <div className="flex h-8 w-24 items-center rounded-lg border border-slate-300 bg-white px-2 focus-within:border-violet-600">
                          <span className="text-xs font-bold text-slate-400">S/</span>
                          <input
                            inputMode="decimal"
                            value={line.unitPrice}
                            onChange={(event) => update(line.key, { unitPrice: event.target.value.replace(/[^\d.]/g, "") })}
                            className="w-full pl-1 text-sm font-semibold text-slate-900 outline-none"
                          />
                        </div>
                        <span className="ml-auto text-sm font-black text-slate-950">{formatPrice((Number(line.unitPrice) || 0) * line.quantity)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="space-y-3 border-t border-slate-200 bg-white p-4 lg:rounded-b-2xl">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Nota (opcional): ej. paga los sábados"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600"
              />
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">{error}</p>}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Total</span>
                <span className="text-2xl font-black text-slate-950">{formatPrice(total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="button" disabled={saving || !lines.length} onClick={submit} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                  {saving ? "Guardando..." : "Registrar venta"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Overlay>
  );
}

/**
 * Registro de un abono: baja el total que debe, desde la venta más antigua.
 * Con `payment` corrige ese abono (el último) con sus datos ya cargados.
 */
export function CreditPaymentForm({
  customerId,
  customerName,
  balance: currentBalance,
  payment,
  onClose,
  onSaved,
}: {
  customerId: string;
  customerName: string;
  balance: number;
  payment?: CreditPayment;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Al corregir, lo que debe se calcula como si ese abono no existiera.
  const balance = payment ? currentBalance + Number(payment.amount) : currentBalance;
  const [amount, setAmount] = useState(payment ? Number(payment.amount).toFixed(2) : "");
  const [method, setMethod] = useState<CreditPaymentMethod>(payment?.method ?? "cash");
  const [paidAt, setPaidAt] = useState(() =>
    new Date(payment?.paidAt ?? Date.now()).toLocaleDateString("en-CA", { timeZone: "America/Lima" }),
  );
  const [note, setNote] = useState(payment?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const value = Number(amount);
  const valid = value > 0 && value <= balance + 0.001;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return setError(`Ingresa un monto entre S/ 0.01 y ${formatPrice(balance)}.`);
    setSaving(true);
    setError("");
    try {
      const body = {
        amount: Math.round(value * 100) / 100,
        method,
        // Mediodía de Lima: evita que la fecha cambie de día por la zona horaria.
        paidAt: new Date(`${paidAt}T12:00:00-05:00`).toISOString(),
        note: note.trim(),
      };
      if (payment) await adminApi.updateCreditPayment(payment.id, body);
      else await adminApi.createCreditPayment(customerId, { ...body, note: body.note || undefined });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo registrar el abono.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="pr-8">
          <h2 className="text-xl font-black text-slate-950">{payment ? "Corregir abono" : "Registrar abono"}</h2>
          <p className="text-sm font-medium text-slate-600">{customerName}</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{payment ? "Debe sin este abono" : "Debe actualmente"}</p>
            <p className="text-xs font-medium text-amber-700">{payment ? `Abono original: ${formatPrice(payment.amount)}` : "Se descuenta desde la venta más antigua"}</p>
          </div>
          <p className="text-2xl font-black text-amber-900">{formatPrice(balance)}</p>
        </div>

        <div>
          <span className="mb-1 block text-sm font-bold text-slate-800">Monto del abono <span className="text-red-500">*</span></span>
          <div className="flex h-14 items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <span className="text-lg font-black text-slate-400">S/</span>
            <input
              autoFocus
              required
              inputMode="decimal"
              value={amount}
              placeholder="0.00"
              onChange={(event) => { setAmount(event.target.value.replace(/[^\d.]/g, "")); setError(""); }}
              className="min-w-0 flex-1 pl-2 text-2xl font-black text-slate-950 outline-none placeholder:text-slate-300"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.filter((quick) => quick < balance).map((quick) => (
              <button key={quick} type="button" onClick={() => setAmount(quick.toFixed(2))} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                S/ {quick}
              </button>
            ))}
            <button type="button" onClick={() => setAmount(balance.toFixed(2))} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
              Pagó todo ({formatPrice(balance)})
            </button>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-bold text-slate-800">Medio de pago</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMethod(item.id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs font-bold ring-1 transition ${method === item.id ? "bg-violet-50 text-violet-800 ring-2 ring-violet-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`}
              >
                <span className="text-lg leading-none">{METHOD_ICONS[item.id]}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha" type="date" value={paidAt} onChange={setPaidAt} required />
          <Field label="Nota (opcional)" value={note} onChange={setNote} placeholder="Ej: pagó en la feria" />
        </div>

        {/* Espacio fijo: el aviso cambia de color pero el modal no cambia de alto. */}
        <div
          className={`flex h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold ring-1 ${
            error || (amount && !valid)
              ? "bg-red-50 text-red-700 ring-red-200"
              : amount
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-slate-50 text-slate-500 ring-slate-200"
          }`}
        >
          {error ? (
            <span className="truncate">{error}</span>
          ) : !amount ? (
            <span>Escribe el monto para ver cuánto quedará debiendo.</span>
          ) : !valid ? (
            <span className="truncate">{value > balance ? `No puede ser mayor a lo que debe (${formatPrice(balance)}).` : "Ingresa un monto válido."}</span>
          ) : balance - value < 0.005 ? (
            <span>✓ La clienta queda al día</span>
          ) : (
            <>
              <span>Quedará debiendo</span>
              <b className="text-base">{formatPrice(balance - value)}</b>
            </>
          )}
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button disabled={saving || !valid} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Guardando..." : payment ? "Guardar corrección" : amount && valid ? `Registrar ${formatPrice(value)}` : "Registrar abono"}
          </button>
        </footer>
      </form>
    </Overlay>
  );
}

function Thumb({ src, alt, size }: { src: string | null; alt: string; size: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 ${size}`}>
      {src ? <Image src={src} alt={alt} fill sizes="48px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-base text-slate-300">📦</span>}
    </span>
  );
}

/** Selector pequeño de talla/color dentro de la fila del producto. */
function MiniSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-violet-600"
    >
      {options.map((option) => <option key={option} value={option}>{label} {option}</option>)}
    </select>
  );
}
