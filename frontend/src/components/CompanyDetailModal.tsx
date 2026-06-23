"use client";

import Link from "next/link";
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    businessType: "",
    whatsappNumber: "",
    storeAddress: "",
    allowsPickup: true,
    allowsDelivery: true,
  });

  function startEdit() {
    if (!company) return;
    setForm({
      name: company.name,
      subdomain: company.subdomain,
      businessType: company.settings?.businessType ?? "",
      whatsappNumber: company.settings?.whatsappNumber ?? "",
      storeAddress: company.settings?.storeAddress ?? "",
      allowsPickup: company.settings?.allowsPickup ?? true,
      allowsDelivery: company.settings?.allowsDelivery ?? true,
    });
    setError("");
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    setError("");
    try {
      const updated = await superApi.updateCompany(companyId, {
        name: form.name.trim(),
        subdomain: form.subdomain.trim(),
        businessType: form.businessType.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        storeAddress: form.storeAddress.trim(),
        allowsPickup: form.allowsPickup,
        allowsDelivery: form.allowsDelivery,
      });
      setCompany(updated);
      onChanged?.();
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error");
    } finally {
      setSaving(false);
    }
  }

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
              <Link href={`/tienda/${company.subdomain}`} target="_blank" className="mt-1 inline-flex text-xs font-bold text-violet-700 hover:underline">
                Abrir tienda pública ↗
              </Link>
            </div>
            <span className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${status.cls}`}>
              {status.label}
            </span>
          </header>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {editing ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Nombre comercial">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT} />
                </FormField>
                <FormField label="Subdominio" help="Cambiarlo modifica la URL pública de la tienda.">
                  <input value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} className={INPUT} />
                </FormField>
                <FormField label="Rubro">
                  <input value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className={INPUT} placeholder="Bodega, Farmacia…" />
                </FormField>
                <FormField label="WhatsApp">
                  <input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} className={INPUT} placeholder="51987654321" />
                </FormField>
                <FormField label="Dirección de la tienda">
                  <input value={form.storeAddress} onChange={(e) => setForm({ ...form, storeAddress: e.target.value })} className={INPUT} />
                </FormField>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <input type="checkbox" checked={form.allowsPickup} onChange={(e) => setForm({ ...form, allowsPickup: e.target.checked })} className="h-4 w-4" />
                    Recojo
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <input type="checkbox" checked={form.allowsDelivery} onChange={(e) => setForm({ ...form, allowsDelivery: e.target.checked })} className="h-4 w-4" />
                    Delivery
                  </label>
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-200 pt-3">
                <button onClick={() => setEditing(false)} className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
                  Cancelar
                </button>
                <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          ) : (
          <>
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

          <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={startEdit}
              className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:bg-violet-100"
            >
              Editar datos
            </button>
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
          </>
          )}
        </div>
      )}
    </Overlay>
  );
}

const INPUT =
  "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600";

function FormField({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-800">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs font-medium text-slate-500">{help}</span>}
    </label>
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
