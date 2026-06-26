"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type DashboardData, type AdminAppointment } from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge, type OrderStatusContext } from "@/components/StatusBadge";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { BarChart } from "@/components/Charts";
import { Skeleton } from "@/components/Skeleton";
import { archetypeOf, resolveCategory } from "@/lib/business-categories";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [subs, setSubs] = useState<{ active: number; expiring: number; expired: number } | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusContext, setStatusContext] = useState<OrderStatusContext>("physical");

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
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Resumen de la tienda</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={isServiceLike ? "Ingresos de hoy" : "Ventas de hoy"} value={formatPrice(data.salesToday)} accent />
        <Stat label={isServiceLike ? "Ingresos del mes" : "Ventas del mes"} value={formatPrice(data.salesMonth)} />
        <Stat label={`${operationsName} de hoy`} value={String(data.ordersToday)} />
        <Stat label="Pendientes" value={String(data.pendingOrders)} />
        <Stat label="Clientes nuevos" value={String(data.newCustomersMonth)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:col-span-2">
          <h2 className="mb-3 font-bold text-slate-900">
            {isServiceLike ? "Ingresos" : "Ventas"} (últimos 14 días)
          </h2>
          <BarChart
            data={data.salesTrend.map((d) => ({ label: d.date, value: d.value }))}
            format={(v) => formatPrice(v)}
          />
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 font-bold text-slate-900">{operationsName} por estado</h2>
          <div className="flex flex-wrap gap-2">
            {data.ordersByStatus.map((s) => (
              <span key={s.status} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                <StatusBadge status={s.status} context={statusContext} />
                <b className="text-slate-800">{s.count}</b>
              </span>
            ))}
            {data.ordersByStatus.length === 0 && (
              <p className="text-sm text-slate-500">
                {isServiceLike ? "Sin solicitudes aún." : "Sin pedidos aún."}
              </p>
            )}
          </div>
        </section>
      </div>

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

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">{recentTitle}</h2>
          <Link href="/panel/pedidos" className="text-sm text-violet-600">
            Ver todas →
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {data.recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              {isServiceLike ? "Aún no hay solicitudes." : "Aún no hay pedidos."}
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => setSelectedId(o.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-xs text-gray-400">{o.publicCode}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={o.status} context={statusContext} />
                      <span className="font-bold">{formatPrice(o.total, o.currency)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {!isServiceLike && data.lowStockProducts.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">Productos con stock bajo</h2>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <ul className="space-y-1 text-sm">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="font-semibold text-amber-600">{p.available} disp.</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold text-slate-950">
          {statusContext === "telecom"
            ? "Planes más solicitados"
            : isServiceLike
              ? "Servicios más solicitados"
              : "Productos más vendidos"}
        </h2>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          {data.topProducts.length === 0 ? (
            <p className="py-4 text-center text-sm font-medium text-slate-600">
              {isServiceLike
                ? "Aparecerán aquí cuando tengas pagos aprobados."
                : "Los productos aparecerán aquí cuando tengas pagos aprobados."}
            </p>
          ) : (
            <ol className="space-y-3">
              {data.topProducts.map((product, index) => (
                <li key={`${product.id}-${product.name}`} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-sm font-black text-violet-700">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{product.name}</span>
                  <span className="text-sm font-bold text-slate-700">{product.units} unidades</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

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
