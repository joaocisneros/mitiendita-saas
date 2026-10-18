"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type DashboardData, type AdminAppointment } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel, StatusBadge, type OrderStatusContext } from "@/components/StatusBadge";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { BarChart, DonutChart } from "@/components/Charts";
import { Skeleton } from "@/components/Skeleton";
import { archetypeOf, resolveCategory, usesCredits } from "@/lib/business-categories";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [subs, setSubs] = useState<{ active: number; expiring: number; expired: number } | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusContext, setStatusContext] = useState<OrderStatusContext>("physical");
  const [showCredits, setShowCredits] = useState(false);

  const isServiceLike = statusContext !== "physical";
  const operationsName = isServiceLike ? "Solicitudes" : "Pedidos";
  const recentTitle = isServiceLike ? "Solicitudes recientes" : "Pedidos recientes";

  const load = useCallback(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));

    adminApi.appointments("pending").then(setAppointments).catch(() => {});
    adminApi.subscriptionsSummary().then(setSubs).catch(() => {});
    adminApi
      .settings()
      .then((settings) => {
        setShowCredits(usesCredits(settings.businessType));
        const category = resolveCategory(settings.businessType);
        const archetype = archetypeOf(category);
        const serviceLike = archetype === "digital" || archetype === "servicios";
        setStatusContext(category.id === "telecomunicaciones" ? "telecom" : serviceLike ? "service" : "physical");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
        <p className="text-4xl">⚠️</p>
        <p className="mt-3 font-bold text-slate-800">No se pudo cargar el resumen</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <button
          onClick={() => {
            setError("");
            setData(null);
            load();
          }}
          className="mt-5 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-700">Así va tu negocio</p>
          <h1 className="mt-1 text-xl font-extrabold">Resumen de la tienda</h1>
        </div>
        <Link href="/panel/reportes" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-violet-700 ring-1 ring-violet-200">Ver reportes</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={isServiceLike ? "Ingresos de hoy" : "Ventas de hoy"} value={formatPrice(data.salesToday)} accent />
        <Stat label={isServiceLike ? "Ingresos del mes" : "Ventas del mes"} value={formatPrice(data.salesMonth)} />
        <Stat label={`${operationsName} de hoy`} value={String(data.ordersToday)} />
        <Stat label="Pendientes" value={String(data.pendingOrders)} />
        <Stat label="Clientes nuevos" value={String(data.newCustomersMonth)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 lg:col-span-2">
          <h2 className="mb-3 font-bold text-slate-900">
            {isServiceLike ? "Ingresos" : "Ventas"} (últimos 14 días)
          </h2>
          <BarChart
            data={data.salesTrend.map((d) => ({ label: d.date, value: d.value }))}
            format={(v) => formatPrice(v)}
            height={145}
          />
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 font-bold text-slate-900">{operationsName} por estado</h2>
          {data.ordersByStatus.length > 0 ? (
            <DonutChart size={130} data={data.ordersByStatus.map((item, index) => ({ label: orderStatusLabel(item.status, statusContext), value: item.count, color: ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#64748b"][index % 6] }))} />
          ) : <div className="flex h-[145px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">{isServiceLike ? "Sin solicitudes aún." : "Sin pedidos aún."}</div>}
        </section>
      </div>

      {showCredits && data.credits && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Ventas al crédito</h2>
            <Link href="/panel/creditos" className="text-sm text-violet-600">
              Ver créditos →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-2xl p-4 ring-1 ${Number(data.credits.receivable) > 0 ? "bg-amber-50 ring-amber-200" : "bg-white ring-black/5"}`}>
              <p className="text-xs text-gray-500">Por cobrar</p>
              <p className="mt-1 text-2xl font-extrabold text-amber-700">{formatPrice(data.credits.receivable)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-500">Cobrado este mes</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600">{formatPrice(data.credits.collectedThisMonth)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-500">Clientas con deuda</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {data.credits.customersWithDebt} <span className="text-base font-bold text-slate-400">de {data.credits.customers}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {subs && subs.active + subs.expiring + subs.expired > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Suscripciones</h2>
            <Link href="/panel/suscripciones" className="text-sm text-violet-600">
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-500">Activas</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600">{subs.active}</p>
            </div>
            <div className={`rounded-2xl p-4 ring-1 ${subs.expiring > 0 ? "bg-orange-50 ring-orange-200" : "bg-white ring-black/5"}`}>
              <p className="text-xs text-gray-500">Por vencer</p>
              <p className="mt-1 text-2xl font-extrabold text-orange-600">{subs.expiring}</p>
            </div>
            <div className={`rounded-2xl p-4 ring-1 ${subs.expired > 0 ? "bg-red-50 ring-red-200" : "bg-white ring-black/5"}`}>
              <p className="text-xs text-gray-500">Vencidas</p>
              <p className="mt-1 text-2xl font-extrabold text-red-600">{subs.expired}</p>
            </div>
          </div>
        </section>
      )}

      {appointments.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Citas pendientes ({appointments.length})</h2>
            <Link href="/panel/citas" className="text-sm text-violet-600">
              Ver todas →
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            <ul className="divide-y divide-black/5">
              {appointments.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{a.serviceName}</p>
                    <p className="text-xs text-gray-400">
                      {a.customerName} · {a.customerPhone}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">
                    {new Date(a.preferredAt).toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">{recentTitle}</h2>
            <Link href="/panel/pedidos" className="text-sm font-semibold text-violet-600">Ver todos →</Link>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {data.recentOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">{isServiceLike ? "Aún no hay solicitudes." : "Aún no hay pedidos."}</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {data.recentOrders.slice(0, 4).map((order) => (
                  <li key={order.id}>
                    <button onClick={() => setSelectedId(order.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50">
                      <div className="min-w-0"><p className="truncate font-semibold">{order.customerName}</p><p className="text-xs text-gray-400">{order.publicCode}</p></div>
                      <div className="flex shrink-0 items-center gap-3"><StatusBadge status={order.status} context={statusContext} /><span className="font-bold">{formatPrice(order.total, order.currency)}</span></div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-bold text-slate-950">Lo más importante</h2>
          <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            {!isServiceLike && data.lowStockProducts.length > 0 && (
              <div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-amber-700">Stock por terminarse</h3><Link href="/panel/inventario" className="text-xs font-semibold text-violet-600">Revisar →</Link></div><ul className="space-y-1.5 text-sm">{data.lowStockProducts.slice(0, 3).map((product) => <li key={product.id} className="flex justify-between gap-3"><span className="truncate">{product.name}</span><span className="shrink-0 font-bold text-amber-700">{product.available} disponibles</span></li>)}</ul></div>
            )}
            <div className={!isServiceLike && data.lowStockProducts.length > 0 ? "border-t border-slate-200 pt-3" : ""}>
              <h3 className="mb-2 text-sm font-bold text-slate-800">{statusContext === "telecom" ? "Planes más solicitados" : isServiceLike ? "Servicios más solicitados" : "Productos más vendidos"}</h3>
              {data.topProducts.length === 0 ? <p className="text-xs text-slate-500">Aparecerán cuando tengas pagos aprobados.</p> : <ol className="space-y-2">{data.topProducts.slice(0, 3).map((product, index) => <li key={`${product.id}-${product.name}`} className="flex items-center gap-2 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-xs font-black text-violet-700">{index + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{product.name}</span><span className="shrink-0 font-bold text-slate-600">{product.units}</span></li>)}</ol>}
            </div>
          </div>
        </section>
      </div>

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ring-black/5 ${accent ? "bg-violet-600 text-white" : "bg-white"}`}>
      <p className={`text-xs ${accent ? "text-white/80" : "text-gray-500"}`}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
