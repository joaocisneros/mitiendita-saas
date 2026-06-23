"use client";

import { useEffect, useState } from "react";
import { superApi, type Plan } from "@/lib/superadmin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";

const EMPTY = {
  name: "",
  slug: "",
  priceMonth: "",
  maxProducts: "",
  isActive: true,
};

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
    };
    try {
      if (editing === "new") await superApi.createPlan(body);
      else if (typeof editing === "number")
        await superApi.updatePlan(editing, body);
      setEditing(null);
      load();
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
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-violet-700">Comercial</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Planes</h1>
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-700">
                  {plan.slug}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {plan.name}
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
              >
                {plan.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="mt-5 text-3xl font-black text-violet-700">
              {formatPrice(plan.priceMonth)}
              <span className="text-sm font-semibold text-slate-600">
                {" "}
                / mes
              </span>
            </p>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {plan.maxProducts == null
                ? "Productos ilimitados"
                : `Hasta ${plan.maxProducts} productos`}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => openEdit(plan)}
                className="flex-1 rounded-xl bg-violet-50 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-100"
              >
                Editar
              </button>
              <button
                onClick={() => toggle(plan)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
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
        <Overlay onClose={() => setEditing(null)}>
          <div>
            <h2 className="pr-9 text-xl font-black text-slate-950">
              {editing === "new" ? "Nuevo plan" : "Editar plan"}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={form.name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      name: value,
                      slug: editing === "new" ? slugify(value) : current.slug,
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
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
                className="h-4 w-4"
              />
              Disponible para asignación
            </label>
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
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
