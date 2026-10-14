"use client";

import { useCallback, useEffect, useState } from "react";
import { superApi, type AuditRow } from "@/lib/superadmin-api";
import { DashboardIcon } from "@/components/DashboardIcon";
import { CompanyDetailModal } from "@/components/CompanyDetailModal";

const LABELS: Record<string, string> = {
  "company.created": "Creó una empresa",
  "company.updated": "Editó una empresa",
  "company.activated": "Activó una empresa",
  "company.suspended": "Suspendió una empresa",
  "company.deleted": "Eliminó una empresa",
  "company.plan_changed": "Cambió el plan de una empresa",
  "company.impersonated": "Ingresó como soporte",
  "plan.created": "Creó un plan",
  "plan.updated": "Actualizó un plan",
  "subscription.paid": "Registró un pago de suscripción",
  "subscription.updated": "Actualizó una suscripción",
  "user.password_reset": "Restableció una contraseña",
  "user.toggled": "Activó/desactivó un usuario",
  "platform.settings_updated": "Actualizó la configuración",
  "platform.whatsapp_updated": "Actualizó la integración de WhatsApp",
  "api_token.approved": "Aprobó una solicitud de token de API",
  "api_token.rejected": "Rechazó una solicitud de token de API",
};

function actionLabel(action: string) {
  return LABELS[action] ?? action;
}

function actionMeta(action: string) {
  if (action.startsWith("subscription.")) return { category: "Suscripción", icon: "plans" as const, box: "bg-emerald-100 text-emerald-700", badge: "bg-emerald-50 text-emerald-700" };
  if (action.startsWith("user.")) return { category: "Usuario", icon: "customers" as const, box: "bg-blue-100 text-blue-700", badge: "bg-blue-50 text-blue-700" };
  if (action.startsWith("plan.")) return { category: "Plan", icon: "reports" as const, box: "bg-amber-100 text-amber-700", badge: "bg-amber-50 text-amber-700" };
  if (action.startsWith("platform.") || action.startsWith("api_token.")) return { category: "Plataforma", icon: "settings" as const, box: "bg-slate-200 text-slate-700", badge: "bg-slate-100 text-slate-700" };
  return { category: "Empresa", icon: "companies" as const, box: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700" };
}

function friendlyDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const prefix = sameDay(date, today) ? "Hoy" : sameDay(date, yesterday) ? "Ayer" : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  return `${prefix}, ${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
}

const DETAIL_LABELS: Record<string, string> = { months: "Meses registrados", status: "Nuevo estado", planId: "Plan asignado", userId: "Usuario", active: "Estado activo" };

export default function ActivityPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [actions, setActions] = useState<string[]>([]);

  const load = useCallback(
    (target = 1) => {
      superApi
        .audits(target, action || undefined)
        .then((result) => {
          setError("");
          setRows(result.items);
          setPage(result.page);
          setPages(result.pages || 1);
        })
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar la actividad.",
          ),
        )
        .finally(() => setLoading(false));
    },
    [action],
  );
  useEffect(() => {
    load(1);
  }, [load]);
  useEffect(() => {
    superApi
      .auditActions()
      .then(setActions)
      .catch(() => setActions([]));
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Seguridad</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">
          Actividad administrativa
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Historial de acciones sensibles realizadas en la plataforma.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div><p className="text-sm font-bold text-slate-900">Filtrar registros</p><p className="mt-0.5 text-xs font-medium text-slate-500">Selecciona un evento específico para encontrarlo rápidamente.</p></div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          <option value="">Todas las acciones</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="divide-y divide-slate-200">
          {rows.map((row) => {
            const meta = actionMeta(row.action);
            const details = row.details ? Object.entries(row.details).filter(([, value]) => value !== undefined && value !== null) : [];
            return (
            <article key={row.id} className="flex gap-4 p-4 transition hover:bg-slate-50/70 sm:p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.box}`}>
                <DashboardIcon name={meta.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-950">{actionLabel(row.action)}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.badge}`}>{meta.category}</span></div>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  <span className="font-bold text-slate-700">{row.superAdmin.name}</span> · {row.superAdmin.email}
                </p>
                {row.companyId && (
                  <p className="mt-2 text-sm">
                    <button
                      onClick={() => setSelectedId(row.companyId)}
                      className="font-bold text-violet-700 hover:underline"
                    >
                      Empresa: {row.companyName ?? "Ver empresa"} →
                    </button>
                  </p>
                )}
                {details.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-slate-500 hover:text-violet-700">Ver datos del cambio</summary><dl className="mt-2 grid max-w-xl gap-1.5 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">{details.map(([key, value]) => <div key={key} className="flex justify-between gap-3"><dt className="text-slate-500">{DETAIL_LABELS[key] ?? key}</dt><dd className="font-bold text-slate-700">{typeof value === "boolean" ? (value ? "Sí" : "No") : String(value)}</dd></div>)}</dl></details>}
              </div>
              <time dateTime={row.createdAt} className="shrink-0 text-right text-xs font-semibold text-slate-500">
                {friendlyDate(row.createdAt)}
              </time>
            </article>
          )})}
          {!loading && rows.length === 0 && (
            <div className="p-12 text-center">
              <DashboardIcon
                name="activity"
                className="mx-auto h-10 w-10 text-slate-400"
              />
              <p className="mt-3 font-bold text-slate-800">
                Aún no hay actividad registrada
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Las nuevas acciones aparecerán aquí.
              </p>
            </div>
          )}
          {loading && (
            <p className="p-12 text-center font-semibold text-slate-600">
              Cargando actividad...
            </p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">
            Página {page} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= pages || loading}
              onClick={() => load(page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {selectedId && (
        <CompanyDetailModal
          companyId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
