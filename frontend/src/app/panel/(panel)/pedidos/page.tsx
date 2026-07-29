"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type AdminOrderRow } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge, type OrderStatusContext } from "@/components/StatusBadge";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { OrderReceiptModal } from "@/components/receipt/OrderReceiptModal";
import { Skeleton } from "@/components/Skeleton";
import { archetypeOf, resolveCategory } from "@/lib/business-categories";

type FilterField = "status" | "paymentStatus";
type Filter = { value: string; label: string; field?: FilterField };

const PHYSICAL_FILTERS: Filter[] = [
  { value: "", label: "Todos" },
  { value: "pending,proof_submitted", label: "Por revisar", field: "paymentStatus" },
  { value: "rejected", label: "Rechazados", field: "paymentStatus" },
  { value: "confirmed", label: "Confirmados", field: "status" },
  { value: "preparing", label: "Preparando", field: "status" },
  { value: "delivered", label: "Entregados", field: "status" },
  { value: "cancelled", label: "Cancelados", field: "status" },
];

const SERVICE_FILTERS: Filter[] = [
  { value: "", label: "Todas" },
  { value: "pending,proof_submitted", label: "Por revisar", field: "paymentStatus" },
  { value: "rejected", label: "Rechazados", field: "paymentStatus" },
  { value: "confirmed", label: "Aceptadas", field: "status" },
  { value: "preparing", label: "En gestión", field: "status" },
  { value: "out_for_delivery", label: "En atención", field: "status" },
  { value: "delivered", label: "Finalizadas", field: "status" },
  { value: "cancelled", label: "Canceladas", field: "status" },
];

/** Un solo estado por fila: el pago mientras no esté aprobado, y el pedido una vez que sí. */
function primaryStatus(o: AdminOrderRow): { status: string; type: "order" | "payment" } {
  if (o.status === "cancelled" || o.status === "expired") return { status: o.status, type: "order" };
  if (o.paymentStatus !== "approved") return { status: o.paymentStatus, type: "payment" };
  return { status: o.status, type: "order" };
}


export default function OrdersListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [filterValue, setFilterValue] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptCode, setReceiptCode] = useState<string | null>(null);
  const [statusContext, setStatusContext] = useState<OrderStatusContext>("physical");
  const [subdomain, setSubdomain] = useState<string | null>(null);

  const isServiceLike = statusContext !== "physical";
  const filters = isServiceLike ? SERVICE_FILTERS : PHYSICAL_FILTERS;
  const activeFilter = filters.find((f) => f.value === filterValue) ?? filters[0];

  const load = useCallback(() => {
    adminApi
      .orders({
        status: activeFilter.field === "status" ? activeFilter.value : undefined,
        paymentStatus: activeFilter.field === "paymentStatus" ? activeFilter.value : undefined,
        search: appliedSearch || undefined,
      })
      .then((d) => {
        setRows(d.items);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [activeFilter, appliedSearch]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    adminApi
      .settings()
      .then((settings) => {
        setSubdomain(settings.subdomain ?? null);
        const category = resolveCategory(settings.businessType);
        const archetype = archetypeOf(category);
        const serviceLike = archetype === "digital" || archetype === "servicios";
        if (archetype === "digital") {
          router.replace("/panel/suscripciones");
          return;
        }
        if (archetype === "servicios") {
          router.replace("/panel/citas");
          return;
        }
        setStatusContext(category.id === "telecomunicaciones" ? "telecom" : serviceLike ? "service" : "physical");
      })
      .catch(() => {});
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Operaciones</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">
            {isServiceLike ? "Solicitudes" : "Pedidos"}
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {isServiceLike
              ? "Las nuevas solicitudes y comprobantes se actualizan automáticamente."
              : "Los nuevos pedidos y comprobantes se actualizan automáticamente."}
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
        >
          Actualizar ahora
        </button>
      </div>

      <div className="flex max-w-xl gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setLoading(true);
              setAppliedSearch(search.trim());
            }
          }}
          placeholder="Código, cliente o teléfono"
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-violet-600"
        />
        <button
          onClick={() => {
            setLoading(true);
            setAppliedSearch(search.trim());
          }}
          className="rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
        >
          Buscar
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setLoading(true);
              setFilterValue(f.value);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
              filterValue === f.value ? "bg-violet-600 text-white" : "bg-white text-gray-700 ring-1 ring-black/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {loading ? (
          <ul className="divide-y divide-black/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-gray-400">
            {isServiceLike ? "No hay solicitudes aquí." : "No hay pedidos aquí."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Pago</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Total</th>
                  {subdomain && <th className="p-4">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="cursor-pointer p-4" onClick={() => setSelectedId(o.id)}>
                      <p className="font-bold text-slate-950">{o.customerName}</p>
                      <p className="text-xs font-medium text-slate-500">{o.publicCode}</p>
                    </td>
                    <td className="cursor-pointer p-4 text-slate-600" onClick={() => setSelectedId(o.id)}>
                      {new Date(o.createdAt).toLocaleString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">
                      {o.detectedMethod || o.operationNumber ? (
                        <div className="flex flex-col items-start gap-1">
                          {o.detectedMethod && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold capitalize text-violet-700">
                              {o.detectedMethod}
                            </span>
                          )}
                          {o.operationNumber && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-500">
                              N° op. {o.operationNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="cursor-pointer p-4" onClick={() => setSelectedId(o.id)}>
                      <StatusBadge {...primaryStatus(o)} context={statusContext} />
                    </td>
                    <td className="cursor-pointer p-4 font-bold text-slate-950" onClick={() => setSelectedId(o.id)}>
                      {formatPrice(o.total, o.currency)}
                    </td>
                    {subdomain && (
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setReceiptCode(o.publicCode)}
                            title="Ver recibo"
                            className="rounded-full bg-violet-50 px-2.5 py-1.5 text-violet-700 hover:bg-violet-100"
                          >
                            🧾
                          </button>
                          <a
                            href={`https://wa.me/${o.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${o.customerName}, aquí tienes tu recibo de compra: ${window.location.origin}/r/pedido/${o.publicCode}`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar por WhatsApp"
                            className="rounded-full bg-green-50 px-2.5 py-1.5 text-green-700 hover:bg-green-100"
                          >
                            📲
                          </a>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}

      {receiptCode && subdomain && (
        <OrderReceiptModal
          subdomain={subdomain}
          code={receiptCode}
          onClose={() => setReceiptCode(null)}
        />
      )}
    </div>
  );
}
