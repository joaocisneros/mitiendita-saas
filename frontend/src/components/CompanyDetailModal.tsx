"use client";

import { useEffect, useState } from "react";
import { superApi, type SaCompanyDetail } from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Activa", cls: "bg-emerald-100 text-emerald-800" },
  suspended: { label: "Suspendida", cls: "bg-red-100 text-red-800" },
  inactive: { label: "Inactiva", cls: "bg-slate-200 text-slate-700" },
};

export function CompanyDetailModal({
  companyId,
  onClose,
}: {
  companyId: string;
  onClose: () => void;
}) {
  const [c, setC] = useState<SaCompanyDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    superApi
      .company(companyId)
      .then(setC)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [companyId]);

  const owner = c?.memberships.find((m) => m.role === "OWNER")?.user;
  const st = c ? (STATUS[c.status] ?? STATUS.inactive) : STATUS.inactive;

  return (
    <Overlay onClose={onClose}>
      {!c ? (
        <p className="p-8 text-center text-slate-500">{error || "Cargando..."}</p>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">{c.name}</h2>
            <p className="text-sm text-slate-500">
              {c.subdomain}.mitiendita.com
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>
              {st.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Mini label="Pedidos" value={String(c._count.orders)} />
            <Mini label="Productos" value={String(c._count.products)} />
            <Mini label="Clientes" value={String(c._count.customers)} />
          </div>

          <Card title="Propietario">
            <p className="font-semibold text-slate-900">{owner?.name ?? "—"}</p>
            <p className="text-sm text-slate-600">{owner?.email ?? "—"}</p>
          </Card>

          <Card title="Plan y volumen">
            <Row label="Plan" value={c.plan?.name ?? "Sin plan"} />
            <Row label="Volumen bruto" value={formatPrice(c.grossVolume)} />
            <Row label="Registrada" value={new Date(c.createdAt).toLocaleDateString("es-PE")} />
          </Card>

          {c.settings && (
            <Card title="Tienda">
              <Row label="WhatsApp" value={c.settings.whatsappNumber ?? "—"} />
              <Row label="Yape" value={c.settings.yapeHolderName ?? "—"} />
              <Row label="Entrega" value={[c.settings.allowsPickup && "Recojo", c.settings.allowsDelivery && "Delivery"].filter(Boolean).join(" · ") || "—"} />
            </Card>
          )}

          <Card title="Pedidos recientes">
            {c.recentOrders.length === 0 ? (
              <p className="text-sm text-slate-400">Sin pedidos.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {c.recentOrders.map((o) => (
                  <li key={o.id} className="flex justify-between text-slate-700">
                    <span>{o.publicCode} · {o.customerName}</span>
                    <span className="font-semibold">{formatPrice(o.total, o.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Overlay>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <h3 className="mb-2 font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
