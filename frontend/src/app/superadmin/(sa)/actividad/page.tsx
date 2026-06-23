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
};

function actionLabel(action: string) {
  return LABELS[action] ?? action;
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
      setLoading(true);
      setError("");
      superApi
        .audits(target, action || undefined)
        .then((result) => {
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
        <h1 className="mt-1 text-3xl font-black text-slate-950">
          Actividad administrativa
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Historial de acciones sensibles realizadas en la plataforma.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
          {rows.map((row) => (
            <div key={row.id} className="flex gap-4 p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <DashboardIcon name="activity" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-950">
                  {actionLabel(row.action)}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Por {row.superAdmin.name} · {row.superAdmin.email}
                </p>
                {row.companyId && (
                  <p className="mt-1 text-sm">
                    <button
                      onClick={() => setSelectedId(row.companyId)}
                      className="font-bold text-violet-700 hover:underline"
                    >
                      {row.companyName ?? "Ver empresa"}
                    </button>
                  </p>
                )}
              </div>
              <time className="shrink-0 text-right text-xs font-semibold text-slate-600">
                {new Date(row.createdAt).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          ))}
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
