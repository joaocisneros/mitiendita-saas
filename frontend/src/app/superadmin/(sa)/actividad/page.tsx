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
  "product.created": "Creó un producto",
  "product.updated": "Editó un producto",
  "product.deleted": "Eliminó un producto",
  "category.created": "Creó una categoría",
  "category.updated": "Editó una categoría",
  "category.deleted": "Eliminó una categoría",
  "order.updated": "Actualizó un pedido",
  "appointment.updated": "Actualizó una cita",
  "inventory.created": "Registró un movimiento de inventario",
  "inventory.updated": "Actualizó el inventario",
  "customer.created": "Creó un cliente",
  "customer.updated": "Editó un cliente",
  "customer.deleted": "Eliminó un cliente",
  "store.updated": "Actualizó la configuración de la tienda",
  "profile.updated": "Actualizó su perfil",
  "access.login": "Inició sesión",
  "access.logout": "Cerró sesión",
  "order.status_updated": "Cambió el estado de un pedido",
  "order.payment_approved": "Aprobó el pago de un pedido",
  "order.payment_rejected": "Rechazó el pago de un pedido",
  "appointment.status_updated": "Cambió el estado de una cita",
  "appointment.payment_approved": "Aprobó el pago de una cita",
  "appointment.payment_rejected": "Rechazó el pago de una cita",
  "inventory.adjusted": "Ajustó el inventario",
};

function actionLabel(action: string) {
  return LABELS[action] ?? action;
}

function actionMeta(action: string) {
  if (action.startsWith("access."))
    return {
      category: "Acceso",
      icon: "lock" as const,
      box: "bg-indigo-100 text-indigo-700",
      badge: "bg-indigo-50 text-indigo-700",
    };
  if (action.startsWith("product.") || action.startsWith("category."))
    return {
      category: "Catálogo",
      icon: "products" as const,
      box: "bg-fuchsia-100 text-fuchsia-700",
      badge: "bg-fuchsia-50 text-fuchsia-700",
    };
  if (action.startsWith("order."))
    return {
      category: "Pedidos",
      icon: "orders" as const,
      box: "bg-cyan-100 text-cyan-700",
      badge: "bg-cyan-50 text-cyan-700",
    };
  if (action.startsWith("inventory."))
    return {
      category: "Inventario",
      icon: "inventory" as const,
      box: "bg-orange-100 text-orange-700",
      badge: "bg-orange-50 text-orange-700",
    };
  if (action.startsWith("appointment."))
    return {
      category: "Citas",
      icon: "calendar" as const,
      box: "bg-pink-100 text-pink-700",
      badge: "bg-pink-50 text-pink-700",
    };
  if (action.startsWith("store.") || action.startsWith("profile."))
    return {
      category: "Configuración",
      icon: "settings" as const,
      box: "bg-slate-200 text-slate-700",
      badge: "bg-slate-100 text-slate-700",
    };
  if (action.startsWith("subscription."))
    return {
      category: "Suscripción",
      icon: "plans" as const,
      box: "bg-emerald-100 text-emerald-700",
      badge: "bg-emerald-50 text-emerald-700",
    };
  if (action.startsWith("user."))
    return {
      category: "Usuario",
      icon: "customers" as const,
      box: "bg-blue-100 text-blue-700",
      badge: "bg-blue-50 text-blue-700",
    };
  if (action.startsWith("plan."))
    return {
      category: "Plan",
      icon: "reports" as const,
      box: "bg-amber-100 text-amber-700",
      badge: "bg-amber-50 text-amber-700",
    };
  if (action.startsWith("platform.") || action.startsWith("api_token."))
    return {
      category: "Plataforma",
      icon: "settings" as const,
      box: "bg-slate-200 text-slate-700",
      badge: "bg-slate-100 text-slate-700",
    };
  return {
    category: "Empresa",
    icon: "companies" as const,
    box: "bg-violet-100 text-violet-700",
    badge: "bg-violet-50 text-violet-700",
  };
}

function friendlyDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const prefix = sameDay(date, today)
    ? "Hoy"
    : sameDay(date, yesterday)
      ? "Ayer"
      : date.toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  return `${prefix}, ${date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
}

const DETAIL_LABELS: Record<string, string> = {
  months: "Meses registrados",
  status: "Estado",
  planId: "Plan asignado",
  oldPlanId: "Plan anterior",
  previousPlanId: "Plan anterior",
  newPlanId: "Plan nuevo",
  userId: "Usuario",
  active: "Estado activo",
  newStatus: "Nuevo estado",
  previousStatus: "Estado anterior",
  method: "Método",
};
const DETAIL_VALUES: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  inactive: "Inactivo",
  trial: "Prueba",
  past_due: "Vencido",
  cancelled: "Cancelado",
  credentials: "Correo y contraseña",
  true: "Sí",
  false: "No",
};
const COMPANY_STATUS_WORDS: Record<string, string> = {
  active: "activa",
  suspended: "suspendida",
  inactive: "inactiva",
};

function detailValue(value: unknown) {
  const raw = String(value);
  return DETAIL_VALUES[raw] ?? raw;
}

function detailSummary(
  entries: [string, unknown][],
  planNames: Record<number, string>,
) {
  const values = Object.fromEntries(entries);
  if (values.previousStatus !== undefined && values.newStatus !== undefined) {
    const previous =
      COMPANY_STATUS_WORDS[String(values.previousStatus)] ??
      detailValue(values.previousStatus).toLowerCase();
    const next =
      COMPANY_STATUS_WORDS[String(values.newStatus)] ??
      detailValue(values.newStatus).toLowerCase();
    return `La empresa pasó de ${previous} a ${next}.`;
  }
  const previousPlanId = values.previousPlanId ?? values.oldPlanId;
  if (previousPlanId !== undefined && values.newPlanId !== undefined) {
    const previous =
      previousPlanId === null
        ? "Sin plan"
        : (planNames[Number(previousPlanId)] ?? `Plan #${previousPlanId}`);
    const next =
      planNames[Number(values.newPlanId)] ?? `Plan #${values.newPlanId}`;
    return `Cambió del plan ${previous} al plan ${next}.`;
  }
  if (values.months !== undefined)
    return `${detailValue(values.months)} ${Number(values.months) === 1 ? "mes registrado" : "meses registrados"}`;
  if (values.active !== undefined)
    return `Usuario: ${detailValue(values.active) === "Sí" ? "Activado" : "Desactivado"}`;
  if (values.status !== undefined)
    return `Estado: ${detailValue(values.status)}`;
  return entries
    .map(
      ([key, value]) =>
        `${DETAIL_LABELS[key] ?? "Dato"}: ${detailValue(value)}`,
    )
    .join(" · ");
}

export default function ActivityPage() {
  const emptyFilters = { action: "", module: "", search: "", from: "", to: "" };
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [planNames, setPlanNames] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(
    (target = 1) => {
      superApi
        .audits(target, filters)
        .then((result) => {
          const normalizedSearch = filters.search.trim().toLowerCase();
          const filtered = result.items.filter((row) => {
            const created = new Date(row.createdAt);
            if (filters.module && !row.action.startsWith(`${filters.module}.`))
              return false;
            if (
              normalizedSearch &&
              !`${actionLabel(row.action)} ${row.superAdmin.name} ${row.superAdmin.email} ${row.companyName ?? ""} ${row.companySubdomain ?? ""} ${row.actorRole ?? ""}`
                .toLowerCase()
                .includes(normalizedSearch)
            )
              return false;
            if (filters.from && created < new Date(`${filters.from}T00:00:00`))
              return false;
            if (filters.to && created > new Date(`${filters.to}T23:59:59.999`))
              return false;
            return true;
          });
          setError("");
          setRows(filtered);
          setPage(1);
          setPages(1);
          setTotal(filtered.length);
        })
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar la auditoría.",
          ),
        )
        .finally(() => setLoading(false));
    },
    [filters],
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
  useEffect(() => {
    superApi
      .plans()
      .then((plans) =>
        setPlanNames(
          Object.fromEntries(plans.map((plan) => [plan.id, plan.name])),
        ),
      )
      .catch(() => setPlanNames({}));
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <p className="text-sm font-bold text-violet-700">Seguridad</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">
          Auditoría global
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Trazabilidad de acciones sensibles realizadas en toda la plataforma.
        </p>
      </div>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-900">
            Buscar en la auditoría
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Combina filtros para localizar una operación específica.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilters(draft);
            }}
            placeholder="Buscar en la auditoría..."
            className="h-10 min-w-[260px] flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-violet-600"
          />
          <select
            aria-label="Filtrar por módulo"
            value={draft.module}
            onChange={(e) => setDraft({ ...draft, module: e.target.value })}
            className="h-10 w-44 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            <option value="">Módulo: todos</option>
            <option value="access">Accesos</option>
            <option value="company">Empresas</option>
            <option value="subscription">Suscripciones</option>
            <option value="user">Usuarios</option>
            <option value="product">Productos</option>
            <option value="category">Categorías</option>
            <option value="order">Pedidos</option>
            <option value="inventory">Inventario</option>
            <option value="appointment">Citas</option>
            <option value="store">Configuración</option>
            <option value="plan">Planes</option>
            <option value="platform">Plataforma</option>
            <option value="api_token">API</option>
          </select>
          <select
            aria-label="Filtrar por acción"
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
            className="h-10 w-52 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            <option value="">Acción: todas</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {showAdvanced ? "Ocultar fechas" : "Más filtros"}
          </button>
          <button
            onClick={() => setFilters(draft)}
            className="h-10 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700"
          >
            Buscar
          </button>
          <button
            aria-label="Limpiar filtros"
            title="Limpiar filtros"
            onClick={() => {
              setDraft(emptyFilters);
              setFilters(emptyFilters);
              setShowAdvanced(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600 hover:bg-slate-200"
          >
            ×
          </button>
        </div>
        {showAdvanced && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Periodo
            </span>
            <label className="flex h-9 w-48 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-500">
              Desde
              <input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none"
              />
            </label>
            <label className="flex h-9 w-48 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-500">
              Hasta
              <input
                type="date"
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none"
              />
            </label>
          </div>
        )}
      </section>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1500px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-40 px-4 py-3">Fecha y hora</th>
                <th className="w-64 px-4 py-3">Responsable</th>
                <th className="w-48 px-4 py-3">Empresa</th>
                <th className="w-32 px-4 py-3">Módulo</th>
                <th className="w-64 px-4 py-3">Acción</th>
                <th className="w-44 px-4 py-3">Elemento afectado</th>
                <th className="w-28 px-4 py-3">Resultado</th>
                <th className="w-72 px-4 py-3">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => {
                const meta = actionMeta(row.action);
                const details = row.details
                  ? Object.entries(row.details).filter(
                      ([, value]) => value !== undefined && value !== null,
                    )
                  : [];
                return (
                  <tr
                    key={row.id}
                    className="align-top transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <time
                        dateTime={row.createdAt}
                        className="text-xs font-semibold text-slate-600"
                      >
                        {friendlyDate(row.createdAt)}
                      </time>
                    </td>
                    <td className="px-4 py-4">
                      <p className="truncate font-bold text-slate-800">
                        {row.superAdmin.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {row.superAdmin.email}
                      </p>
                      <span className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {row.actorRole ?? "Superadministrador"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {row.companyId ? (
                        <button
                          onClick={() => setSelectedId(row.companyId)}
                          className="font-bold text-violet-700 hover:underline"
                        >
                          {row.companyName ?? "Ver empresa"} →
                        </button>
                      ) : (
                        <span className="text-slate-400">No aplica</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${meta.badge}`}
                      >
                        {meta.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.box}`}
                        >
                          <DashboardIcon name={meta.icon} className="h-4 w-4" />
                        </span>
                        <span className="font-bold text-slate-950">
                          {actionLabel(row.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">
                      {row.entityId
                        ? `${meta.category} · ${row.entityId.slice(0, 8)}`
                        : (row.companyName ?? meta.category)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-800">
                        Correcto
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          details.length > 0
                            ? "text-xs font-semibold text-slate-700"
                            : "text-xs text-slate-400"
                        }
                      >
                        {details.length > 0
                          ? detailSummary(details, planNames)
                          : "Sin cambios adicionales"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="p-12 text-center">
                      <DashboardIcon
                        name="activity"
                        className="mx-auto h-10 w-10 text-slate-400"
                      />
                      <p className="mt-3 font-bold text-slate-800">
                        Aún no hay registros de auditoría
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        Las nuevas acciones auditadas aparecerán aquí.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center font-semibold text-slate-600"
                  >
                    Cargando auditoría...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-600">
            {total} registros · Página {page} de {pages}
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
