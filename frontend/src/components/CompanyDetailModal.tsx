"use client";

import { useEffect, useState } from "react";
import { Overlay } from "@/components/OrderDetailModal";
import { formatPrice } from "@/lib/format";
import { superApi, type SaCompanyDetail } from "@/lib/superadmin-api";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Activa", cls: "bg-emerald-100 text-emerald-800" },
  suspended: { label: "Suspendida", cls: "bg-red-100 text-red-800" },
  inactive: { label: "Inactiva", cls: "bg-slate-200 text-slate-700" },
};

export function CompanyDetailModal({
  companyId,
  onClose,
  onChanged,
}: {
  companyId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [company, setCompany] = useState<SaCompanyDetail | null>(null);
  const [error, setError] = useState("");

  async function impersonate() {
    try {
      const { accessToken } = await superApi.impersonate(companyId);
      localStorage.setItem("mt_access", accessToken);
      window.open("/panel", "_blank");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }

  async function resetOwner() {
    const password = prompt("Nueva contraseña para el dueño (mínimo 8 caracteres):");
    if (!password || password.length < 8) {
      if (password) alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    try {
      await superApi.resetOwnerPassword(companyId, password);
      alert("Contraseña del dueño actualizada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }

  async function removeCompany() {
    if (!confirm("¿Eliminar esta empresa? Quedará inactiva y oculta.")) return;

    try {
      await superApi.deleteCompany(companyId);
      onChanged?.();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    }
  }

  useEffect(() => {
    superApi
      .company(companyId)
      .then(setCompany)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Error"));
  }, [companyId]);

  const owner = company?.memberships.find((membership) => membership.role === "OWNER")?.user;
  const status = company ? (STATUS[company.status] ?? STATUS.inactive) : STATUS.inactive;

  return (
    <Overlay onClose={onClose} size="wide">
      {!company ? (
        <p className="p-8 text-center text-slate-500">{error || "Cargando..."}</p>
      ) : (
        <div className="space-y-3">
          <header className="flex flex-col gap-2 pr-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-slate-950 sm:text-2xl">{company.name}</h2>
              <p className="truncate text-sm text-slate-500">{company.subdomain}.mitiendita.com</p>
            </div>
            <span className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}>
              {status.label}
            </span>
          </header>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Pedidos" value={String(company._count.orders)} />
            <Mini label="Productos" value={String(company._count.products)} />
            <Mini label="Clientes" value={String(company._count.customers)} />
            <Mini label="Volumen bruto" value={formatPrice(company.grossVolume)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Card title="Propietario">
                <p className="font-semibold text-slate-900">{owner?.name ?? "—"}</p>
                <p className="break-all text-sm text-slate-600">{owner?.email ?? "—"}</p>
              </Card>

              <Card title="Plan y tienda">
                <div className="space-y-1.5">
                  <Row label="Plan" value={company.plan?.name ?? "Sin plan"} />
                  <Row label="Registrada" value={new Date(company.createdAt).toLocaleDateString("es-PE")} />
                  {company.settings && (
                    <>
                      <Row label="WhatsApp" value={company.settings.whatsappNumber ?? "—"} />
                      <Row label="Yape" value={company.settings.yapeHolderName ?? "—"} />
                      <Row
                        label="Entrega"
                        value={
                          [
                            company.settings.allowsPickup && "Recojo",
                            company.settings.allowsDelivery && "Delivery",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"
                        }
                      />
                    </>
                  )}
                </div>
              </Card>
            </div>

            <Card title="Pedidos recientes">
              {company.recentOrders.length === 0 ? (
                <p className="text-sm text-slate-400">Sin pedidos.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto pr-1">
                  <ul className="divide-y divide-slate-200 text-sm">
                    {company.recentOrders.map((order) => (
                      <li
                        key={order.id}
                        className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-800">{order.publicCode}</span>
                          <span className="block truncate text-xs text-slate-500">{order.customerName}</span>
                        </span>
                        <span className="shrink-0 font-bold text-slate-900">
                          {formatPrice(order.total, order.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
            <button
              onClick={impersonate}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700"
            >
              Ingresar como soporte
            </button>
            <button
              onClick={resetOwner}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Restablecer contraseña
            </button>
            <button
              onClick={removeCompany}
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              Eliminar empresa
            </button>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
      <p className="truncate text-base font-black text-slate-950 sm:text-lg">{value}</p>
      <p className="text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <h3 className="mb-2 font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm text-slate-600">
      <span>{label}</span>
      <span className="text-right font-semibold text-slate-800">{value}</span>
    </div>
  );
}
