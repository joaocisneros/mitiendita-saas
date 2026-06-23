"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  superApi,
  type Plan,
  type SaCompanyDetail,
} from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<SaCompanyDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([superApi.company(id), superApi.plans()])
      .then(([detail, planRows]) => {
        setCompany(detail);
        setPlans(planRows);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar la empresa.",
        ),
      );
  }
  useEffect(load, [id]);

  async function toggle() {
    if (!company) return;
    setBusy(true);
    try {
      if (company.status === "active") await superApi.suspend(company.id);
      else await superApi.activate(company.id);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  async function changePlan(planId: number) {
    if (!company) return;
    setBusy(true);
    try {
      await superApi.assignPlan(company.id, planId);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!company && !error)
    return (
      <div className="h-72 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
    );
  if (!company)
    return (
      <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">
        {error}
      </p>
    );
  const owner = company.memberships.find(
    (membership) => membership.role === "OWNER",
  )?.user;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Link
        href="/superadmin/empresas"
        className="text-sm font-bold text-violet-700 hover:underline"
      >
        ← Volver a empresas
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-950">
              {company.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${company.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
            >
              {company.status === "active" ? "Activa" : "Suspendida"}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Registrada el{" "}
            {new Date(company.createdAt).toLocaleDateString("es-PE")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/tienda/${company.subdomain}`}
            target="_blank"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Ver tienda ↗
          </Link>
          <button
            disabled={busy}
            onClick={toggle}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold ${company.status === "active" ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
          >
            {company.status === "active"
              ? "Suspender tienda"
              : "Activar tienda"}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Volumen aprobado"
          value={formatPrice(company.grossVolume)}
          accent
        />
        <Metric label="Pedidos" value={String(company._count.orders)} />
        <Metric label="Productos" value={String(company._count.products)} />
        <Metric label="Clientes" value={String(company._count.customers)} />
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Información comercial">
          <Info label="Subdominio" value={company.subdomain} />
          <Info
            label="Rubro"
            value={company.settings?.businessType ?? "No definido"}
          />
          <Info
            label="WhatsApp"
            value={company.settings?.whatsappNumber ?? "No configurado"}
          />
          <Info
            label="Dirección"
            value={company.settings?.storeAddress ?? "No configurada"}
          />
          <Info
            label="Entrega"
            value={
              [
                company.settings?.allowsPickup && "Recojo",
                company.settings?.allowsDelivery && "Delivery",
              ]
                .filter(Boolean)
                .join(" y ") || "No configurada"
            }
          />
        </Card>
        <Card title="Cuenta y plan">
          <Info label="Propietario" value={owner?.name ?? "Sin propietario"} />
          <Info label="Correo" value={owner?.email ?? "No disponible"} />
          <Info
            label="Estado del usuario"
            value={owner?.isActive ? "Activo" : "Inactivo"}
          />
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-bold text-slate-800">
              Plan asignado
            </span>
            <select
              disabled={busy}
              value={company.plan?.id ?? ""}
              onChange={(event) => changePlan(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-900"
            >
                {plans
                  .filter(
                    (plan) => plan.isActive || plan.id === company.plan?.id,
                  )
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {formatPrice(plan.priceMonth)}
                    </option>
                  ))}
            </select>
          </label>
        </Card>
      </div>
      <Card title="Pedidos recientes">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left text-xs font-black uppercase tracking-wide text-slate-600">
              <tr>
                <th className="pb-3">Código</th>
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Pedido</th>
                <th className="pb-3">Pago</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {company.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 font-bold text-slate-950">
                    {order.publicCode}
                  </td>
                  <td className="py-3 font-medium text-slate-800">
                    {order.customerName}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={order.paymentStatus} type="payment" />
                  </td>
                  <td className="py-3 text-right font-black text-slate-950">
                    {formatPrice(order.total, order.currency)}
                  </td>
                </tr>
              ))}
              {company.recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center font-medium text-slate-600"
                  >
                    Esta empresa aún no tiene pedidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-right font-bold text-slate-900">{value}</span>
    </div>
  );
}
function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ring-1 ${accent ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-950 ring-slate-200"}`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${accent ? "text-violet-100" : "text-slate-600"}`}
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
