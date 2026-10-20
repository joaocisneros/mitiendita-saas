"use client";

import { useEffect, useState } from "react";
import { refreshPublicPrices, superApi, type Plan } from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";

const EMPTY = {
  name: "",
  slug: "",
  priceMonth: "",
  maxProducts: "",
  isActive: true,
  isPublic: true,
  maxImages: "12",
  featExcel: true,
  featCredits: true,
  featSeo: true,
  featPrioritySupport: false,
  featSetup: false,
  featNoBranding: false,
};

/** Funciones que se marcan por plan. Las 3 primeras las bloquea el sistema; las otras se muestran en precios. */
/**
 * Funciones que se marcan por plan.
 * "system": el sistema las activa o bloquea solo. "service": solo se muestran en la fanpage (las das tú).
 */
const FEATURES = [
  {
    key: "featExcel",
    group: "system",
    label: "📊 Excel con la ganancia del mes",
    hint: "En Reportes, la dueña descarga un Excel con sus ventas y lo que ganó.",
  },
  {
    key: "featCredits",
    group: "system",
    label: "🤝 Ventas al crédito y abonos",
    hint: "La dueña fía a sus clientas y anota los abonos (rubros como ropa, bodega, joyería).",
  },
  {
    key: "featSeo",
    group: "system",
    label: "🔎 Título y descripción propios para Google",
    hint: "La dueña escribe cómo sale su tienda en Google. Sin esto sale “Nombre | Tienda online”.",
  },
  {
    key: "featNoBranding",
    group: "system",
    label: "🏷️ Quitar “Hecho con MiTiendita” de la tienda",
    hint: "Sin marcar, al final de su tienda dice “Hecho con MiTiendita”.",
  },
  {
    key: "featPrioritySupport",
    group: "service",
    label: "⚡ Soporte prioritario",
    hint: "A estas dueñas les respondes primero por WhatsApp.",
  },
  {
    key: "featSetup",
    group: "service",
    label: "🧑‍💻 Te dejamos la tienda lista",
    hint: "Tú le subes sus productos y fotos para empezar.",
  },
] as const;

const FEATURE_GROUPS = [
  { id: "system", title: "Lo activa o bloquea el sistema" },
  { id: "service", title: "Solo se muestra en tu fanpage (lo das tú)" },
] as const;

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    superApi
      .plans()
      .then(setPlans)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar los planes.",
        ),
      );
  }
  useEffect(load, []);
  function openNew() {
    setForm({ ...EMPTY });
    setEditing("new");
    setError("");
  }
  function openEdit(plan: Plan) {
    setForm({
      name: plan.name,
      slug: plan.slug,
      priceMonth: plan.priceMonth,
      maxProducts: plan.maxProducts == null ? "" : String(plan.maxProducts),
      isActive: plan.isActive,
      isPublic: plan.isPublic ?? true,
      maxImages: String(plan.maxImages ?? 12),
      featExcel: plan.featExcel ?? true,
      featCredits: plan.featCredits ?? true,
      featSeo: plan.featSeo ?? true,
      featPrioritySupport: plan.featPrioritySupport ?? false,
      featSetup: plan.featSetup ?? false,
      featNoBranding: plan.featNoBranding ?? false,
    });
    setEditing(plan.id);
    setError("");
  }
  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function save() {
    if (!form.name.trim() || !form.slug.trim() || form.priceMonth === "") {
      setError("Nombre, identificador y precio son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      priceMonth: Number(form.priceMonth),
      maxProducts: form.maxProducts === "" ? null : Number(form.maxProducts),
      isActive: form.isActive,
      isPublic: form.isPublic,
      maxImages: Math.min(12, Math.max(1, Number(form.maxImages) || 12)),
      featExcel: form.featExcel,
      featCredits: form.featCredits,
      featSeo: form.featSeo,
      featPrioritySupport: form.featPrioritySupport,
      featSetup: form.featSetup,
      featNoBranding: form.featNoBranding,
    };
    try {
      if (editing === "new") await superApi.createPlan(body);
      else if (typeof editing === "number")
        await superApi.updatePlan(editing, body);
      setEditing(null);
      load();
      void refreshPublicPrices();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo guardar el plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(plan: Plan) {
    await superApi.updatePlan(plan.id, { isActive: !plan.isActive });
    load();
    void refreshPublicPrices();
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Comercial</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Planes</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Controla precios, límites y disponibilidad.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
        >
          + Nuevo plan
        </button>
      </div>
      {error && !editing && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[...plans]
          .sort((a, b) => Number(a.priceMonth) - Number(b.priceMonth))
          .map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${plan.isActive ? "" : "opacity-70"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-slate-950">
                  {plan.name}
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  /{plan.slug}
                </p>
              </div>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {plan.isPublic === false && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    Privado
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${plan.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                  />
                  {plan.isActive ? "Activo" : "Inactivo"}
                </span>
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-950">
              {formatPrice(plan.priceMonth)}
              <span className="text-xs font-semibold text-slate-500">
                {" "}
                / mes
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-violet-700">
              <span className="rounded-md bg-violet-50 px-2 py-0.5">
                {plan.maxProducts == null
                  ? "Productos ilimitados"
                  : `${plan.maxProducts} productos`}
              </span>
              <span className="rounded-md bg-violet-50 px-2 py-0.5">
                {plan.maxImages ?? 12} fotos c/u
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[13px]">
              {FEATURES.map((feature) => {
                const on = Boolean(plan[feature.key]);
                return (
                  <li
                    key={feature.key}
                    className={`flex items-start gap-2 ${on ? "font-medium text-slate-700" : "text-slate-400"}`}
                  >
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-black ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                    >
                      {on ? "✓" : "–"}
                    </span>
                    <span className="leading-snug">
                      {feature.label.slice(feature.label.indexOf(" ") + 1)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex gap-2 pt-4">
              <button
                onClick={() => openEdit(plan)}
                className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-bold text-white hover:bg-violet-700"
              >
                Editar
              </button>
              <button
                onClick={() => toggle(plan)}
                className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {plan.isActive ? "Desactivar" : "Activar"}
              </button>
            </div>
          </article>
          ))}
        {plans.length === 0 && (
          <p className="font-medium text-slate-600">
            No hay planes configurados.
          </p>
        )}
      </section>
      {editing && (
        <Overlay onClose={() => setEditing(null)} size="wide">
          <div>
            <h2 className="pr-9 text-xl font-black text-slate-950">
              {editing === "new" ? "Nuevo plan" : "Editar plan"}
            </h2>
            {/* Dos columnas: datos del plan a la izquierda y lo que incluye a la derecha. */}
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-black text-slate-900">
                  Datos del plan
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre">
                    <input
                      value={form.name}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((current) => ({
                          ...current,
                          name: value,
                          slug:
                            editing === "new" ? slugify(value) : current.slug,
                        }));
                      }}
                      className="field"
                      placeholder="Profesional"
                    />
                  </Field>
                  <Field label="Identificador">
                    <input
                      value={form.slug}
                      onChange={(event) =>
                        setForm({ ...form, slug: slugify(event.target.value) })
                      }
                      className="field"
                      placeholder="profesional"
                    />
                  </Field>
                  <Field label="Precio mensual">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.priceMonth}
                      onChange={(event) =>
                        setForm({ ...form, priceMonth: event.target.value })
                      }
                      className="field"
                      placeholder="89.00"
                    />
                  </Field>
                  <Field label="Máximo de productos">
                    <input
                      type="number"
                      min="1"
                      value={form.maxProducts}
                      onChange={(event) =>
                        setForm({ ...form, maxProducts: event.target.value })
                      }
                      className="field"
                      placeholder="Vacío = ilimitado"
                    />
                  </Field>
                  <Field label="Fotos por producto (1 a 12)">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={form.maxImages}
                      onChange={(event) =>
                        setForm({ ...form, maxImages: event.target.value })
                      }
                      className="field"
                      placeholder="12"
                    />
                  </Field>
                </div>
                {/* Dónde aparece el plan: en Empresas (para asignarlo) y/o en la fanpage (precios). */}
                <p className="mt-5 text-sm font-black text-slate-900">
                  ¿Dónde aparece este plan?
                </p>
                <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm({ ...form, isActive: event.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-violet-600"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">
                      🏢 En Empresas, para asignarlo
                    </span>
                    <span className="block text-xs text-slate-500">
                      Sale en la lista de planes de cada empresa.
                    </span>
                  </span>
                </label>
                <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(event) =>
                      setForm({ ...form, isPublic: event.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-violet-600"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">
                      🌐 En tu fanpage (página de precios)
                    </span>
                    <span className="block text-xs text-slate-500">
                      Cualquier persona lo ve y puede registrarse con él.
                    </span>
                  </span>
                </label>
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-xs font-bold ${
                    !form.isActive
                      ? "bg-slate-100 text-slate-600"
                      : form.isPublic
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {!form.isActive
                    ? "⏸ Plan apagado: no se puede asignar a empresas nuevas (las que ya lo tienen lo conservan)."
                    : form.isPublic
                      ? "✅ Plan público: sale en tu fanpage y en Empresas."
                      : "🔒 Plan privado para empresas: no sale en tu fanpage, solo tú lo asignas en Empresas."}
                </p>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">
                  Qué incluye este plan
                </p>
                <p className="text-xs text-slate-500">
                  Se aplica al instante a todas las tiendas con este plan.
                </p>
                {FEATURE_GROUPS.map((group) => (
                  <div key={group.id} className="mt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {group.title}
                    </p>
                    <div className="mt-1.5 grid gap-2">
                      {FEATURES.filter(
                        (feature) => feature.group === group.id,
                      ).map((feature) => (
                        <label
                          key={feature.key}
                          className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={form[feature.key]}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                [feature.key]: event.target.checked,
                              })
                            }
                            className="mt-0.5 h-4 w-4 accent-violet-600"
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-800">
                              {feature.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {feature.hint}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3 lg:ml-auto lg:w-1/2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar plan"}
              </button>
            </div>
          </div>
        </Overlay>
      )}
      <style>{`.field{height:2.75rem;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;padding:0 .75rem;color:#0f172a;outline:none}.field:focus{border-color:#7c3aed;box-shadow:0 0 0 3px #ede9fe}`}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-800">
        {label}
      </span>
      {children}
    </label>
  );
}
