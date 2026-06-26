"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  adminApi,
  type AdminCategory,
  type AdminProduct,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";
import { Overlay } from "@/components/OrderDetailModal";
import { archetypeOf, resolveCategory } from "@/lib/business-categories";

const EMPTY = {
  name: "",
  price: "",
  stock: "",
  sku: "",
  categoryId: "",
  shortDescription: "",
  benefits: "",
  description: "",
  imageUrl: "",
  isFeatured: false,
  isActive: true,
};

function splitDescription(description?: string | null) {
  const raw = description ?? "";
  const [short = "", rest = ""] = raw.split(/\n---\n/);
  if (raw.includes("\n---\n")) {
    return {
      shortDescription: short.trim(),
      benefits: rest.trim(),
      description: "",
    };
  }
  return {
    shortDescription: "",
    benefits: "",
    description: raw,
  };
}

function joinPlanDescription(shortDescription: string, benefits: string) {
  const cleanShort = shortDescription.trim();
  const cleanBenefits = benefits.trim();
  if (cleanShort && cleanBenefits) return `${cleanShort}\n---\n${cleanBenefits}`;
  return cleanShort || cleanBenefits;
}

export default function ProductosPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [isService, setIsService] = useState(false);

  const noun = isDigital ? "plan" : isService ? "servicio" : "producto";
  const nounPlural = isDigital ? "Planes" : isService ? "Servicios" : "Productos";

  const descriptionPreview = useMemo(
    () => joinPlanDescription(form.shortDescription, form.benefits),
    [form.shortDescription, form.benefits],
  );

  function load() {
    adminApi.products({}).then((d) => setProducts(d.items));
    adminApi.categories().then(setCategories).catch(() => {});
    adminApi
      .settings()
      .then((settings) => {
        const archetype = archetypeOf(resolveCategory(settings.businessType));
        setIsDigital(archetype === "digital");
        setIsService(archetype === "servicios");
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({ ...EMPTY, stock: isDigital || isService ? "999" : "" });
    setEditing("new");
    setError("");
  }

  function openEdit(product: AdminProduct) {
    const parsed = splitDescription(product.description);
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      sku: product.sku ?? "",
      categoryId: product.categoryId ?? "",
      shortDescription: parsed.shortDescription,
      benefits: parsed.benefits,
      description: parsed.description,
      imageUrl: product.imageUrl ?? "",
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setEditing(product.id);
    setError("");
  }

  async function save() {
    setError("");
    if (!form.name || !form.price || form.stock === "") {
      setError(`Nombre, precio y ${isDigital || isService ? "stock interno" : "stock"} son obligatorios.`);
      return;
    }
    setSaving(true);
    try {
      const description = isDigital || isService ? descriptionPreview : form.description.trim();
      const body = {
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        sku: form.sku || undefined,
        categoryId: form.categoryId || null,
        description: description || undefined,
        imageUrl: form.imageUrl || undefined,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
      };
      if (editing === "new") await adminApi.createProduct(body);
      else if (editing) await adminApi.updateProduct(editing, body);
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function onImage(file: File) {
    setUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file, "products");
      setForm((current) => ({ ...current, imageUrl: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  async function remove(product: AdminProduct) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    await adminApi.deleteProduct(product.id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{nounPlural}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isDigital
              ? "Edita tus planes, beneficios, fotos y precios mensuales."
              : isService
                ? "Edita tus servicios, descripción, fotos y precios."
                : "Edita tus productos, fotos, precios y stock."}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          + Nuevo {noun}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl text-gray-300">📦</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{product.name}</p>
              <p className="text-sm font-bold text-violet-700">{formatPrice(product.price)}</p>
              <p className="text-xs text-gray-400">
                {isDigital || isService ? "Activo para venta" : `Stock: ${product.stock - product.reserved}`} {!product.isActive && "· inactivo"}
              </p>
              <div className="mt-1 flex gap-2 text-xs">
                <button onClick={() => openEdit(product)} className="text-violet-600">
                  Editar
                </button>
                <button onClick={() => remove(product)} className="text-red-500">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-400">Aún no tienes {nounPlural.toLowerCase()}. Crea el primero.</p>
        )}
      </div>

      {editing && (
        <Overlay onClose={() => setEditing(null)} size="wide">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 pr-10">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {editing === "new" ? `Nuevo ${noun}` : `Editar ${noun}`}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Completa la información principal y guarda los cambios.
              </p>
            </div>
            <div className="flex gap-4">
              <Check label="Destacado" checked={form.isFeatured} onChange={(value) => setForm({ ...form, isFeatured: value })} />
              <Check label="Activo" checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <Input label={`Nombre del ${noun} *`} value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={isDigital ? "Precio mensual *" : "Precio *"} type="number" value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
                <Input
                  label={isDigital || isService ? "Stock interno *" : "Stock *"}
                  type="number"
                  value={form.stock}
                  onChange={(value) => setForm({ ...form, stock: value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="SKU (opcional)" value={form.sku} onChange={(value) => setForm({ ...form, sku: value })} />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Categoría</span>
                  <select
                    value={form.categoryId}
                    onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {isDigital || isService ? (
                <>
                  <Textarea
                    label="Descripción corta"
                    value={form.shortDescription}
                    onChange={(value) => setForm({ ...form, shortDescription: value })}
                    rows={2}
                    placeholder={isDigital ? "Ej: Internet de fibra ideal para teletrabajo, streaming y juegos." : "Ej: Servicio profesional con atención personalizada."}
                  />
                  <Textarea
                    label={isDigital ? "Beneficios del plan" : "Características del servicio"}
                    value={form.benefits}
                    onChange={(value) => setForm({ ...form, benefits: value })}
                    rows={4}
                    placeholder={
                      isDigital
                        ? "200 Mbps de bajada\nInstalación gratis\nRouter WiFi incluido\nSoporte por WhatsApp"
                        : "Duración aproximada 60 min\nIncluye asesoría\nAtención previa reserva"
                    }
                  />
                </>
              ) : (
                <Textarea
                  label="Descripción"
                  value={form.description}
                  onChange={(value) => setForm({ ...form, description: value })}
                  rows={5}
                  placeholder="Describe el producto para que el cliente entienda qué está comprando."
                />
              )}
            </div>

            <aside className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div>
                <span className="mb-2 block text-sm font-bold text-gray-700">Foto</span>
                <div className="flex items-center gap-3">
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                    {form.imageUrl ? (
                      <Image src={form.imageUrl} alt="" fill sizes="112px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl text-gray-300">📦</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="inline-flex cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                      {uploading ? "Subiendo..." : "Subir foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) onImage(file);
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Recomendado: imagen horizontal y clara.
                    </p>
                  </div>
                </div>
              </div>

              {(isDigital || isService) && (
                <div className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  El stock interno puede quedar en <b>999</b> para planes/servicios sin inventario físico.
                </div>
              )}

              {(isDigital || isService) && (
                <div className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                  La descripción corta se muestra como texto y cada línea de beneficios aparece con checks en la tienda.
                </div>
              )}

              {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setEditing(null)} className="rounded-lg bg-white py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || uploading}
                  className="rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </aside>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
