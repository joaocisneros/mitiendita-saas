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

const DETAIL_LABELS: Record<string, string> = { months: "Meses registrados", status: "Estado", planId: "Plan asignado", oldPlanId: "Plan anterior", newPlanId: "Plan nuevo", userId: "Usuario", active: "Estado activo", newStatus: "Nuevo estado", previousStatus: "Estado anterior" };
const DETAIL_VALUES: Record<string, string> = { active: "Activo", suspended: "Suspendido", inactive: "Inactivo", trial: "Prueba", past_due: "Vencido", cancelled: "Cancelado", true: "Sí", false: "No" };

function detailValue(value: unknown) {
  const raw = String(value);
  return DETAIL_VALUES[raw] ?? raw;
}

function detailSummary(entries: [string, unknown][]) {
  const values = Object.fromEntries(entries);
  if (values.previousStatus !== undefined && values.newStatus !== undefined) return `Estado: ${detailValue(values.previousStatus)} → ${detailValue(values.newStatus)}`;
  if (values.oldPlanId !== undefined && values.newPlanId !== undefined) return `Plan anterior: ${detailValue(values.oldPlanId)} · Plan nuevo: ${detailValue(values.newPlanId)}`;
  if (values.months !== undefined) return `${detailValue(values.months)} ${Number(values.months) === 1 ? "mes registrado" : "meses registrados"}`;
  if (values.active !== undefined) return `Usuario: ${detailValue(values.active) === "Sí" ? "Activado" : "Desactivado"}`;
  if (values.status !== undefined) return `Estado: ${detailValue(values.status)}`;
  return entries.map(([key, value]) => `${DETAIL_LABELS[key] ?? "Dato"}: ${detailValue(value)}`).join(" · ");
}

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
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1120px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-600">
              <tr><th className="w-40 px-4 py-3">Fecha y hora</th><th className="w-64 px-4 py-3">Administrador</th><th className="w-64 px-4 py-3">Acción</th><th className="w-48 px-4 py-3">Empresa</th><th className="w-28 px-4 py-3">Tipo</th><th className="w-64 px-4 py-3">Detalles</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
          {rows.map((row) => {
            const meta = actionMeta(row.action);
            const details = row.details ? Object.entries(row.details).filter(([, value]) => value !== undefined && value !== null) : [];
            return (
            <tr key={row.id} className="align-top transition hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-4"><time dateTime={row.createdAt} className="text-xs font-semibold text-slate-600">{friendlyDate(row.createdAt)}</time></td>
              <td className="px-4 py-4"><p className="truncate font-bold text-slate-800">{row.superAdmin.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{row.superAdmin.email}</p></td>
              <td className="px-4 py-4"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.box}`}><DashboardIcon name={meta.icon} className="h-4 w-4" /></span><span className="font-bold text-slate-950">{actionLabel(row.action)}</span></div></td>
              <td className="px-4 py-4">{row.companyId ? <button onClick={() => setSelectedId(row.companyId)} className="font-bold text-violet-700 hover:underline">{row.companyName ?? "Ver empresa"} →</button> : <span className="text-slate-400">No aplica</span>}</td>
              <td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${meta.badge}`}>{meta.category}</span></td>
              <td className="px-4 py-4"><span className={details.length > 0 ? "text-xs font-semibold text-slate-700" : "text-xs text-slate-400"}>{details.length > 0 ? detailSummary(details) : "Sin cambios adicionales"}</span></td>
            </tr>
          )})}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={6}><div className="p-12 text-center">
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
            </div></td></tr>
          )}
          {loading && (
            <tr><td colSpan={6} className="p-12 text-center font-semibold text-slate-600">
              Cargando actividad...
            </td></tr>
          )}
            </tbody>
          </table>
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
