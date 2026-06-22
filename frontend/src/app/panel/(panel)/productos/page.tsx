"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  adminApi,
  type AdminCategory,
  type AdminProduct,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/format";

const EMPTY = {
  name: "",
  price: "",
  stock: "",
  sku: "",
  categoryId: "",
  description: "",
  imageUrl: "",
  isFeatured: false,
  isActive: true,
};

export default function ProductosPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // id o "new"
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    adminApi.products({}).then((d) => setProducts(d.items));
    adminApi.categories().then(setCategories).catch(() => {});
  }
  useEffect(load, []);

  function openNew() {
    setForm({ ...EMPTY });
    setEditing("new");
    setError("");
  }
  function openEdit(p: AdminProduct) {
    setForm({
      name: p.name,
      price: String(p.price),
      stock: String(p.stock),
      sku: p.sku ?? "",
      categoryId: p.categoryId ?? "",
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      isFeatured: p.isFeatured,
      isActive: p.isActive,
    });
    setEditing(p.id);
    setError("");
  }

  async function save() {
    setError("");
    if (!form.name || !form.price || form.stock === "") {
      setError("Nombre, precio y stock son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        sku: form.sku || undefined,
        categoryId: form.categoryId || null,
        description: form.description || undefined,
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
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  async function remove(p: AdminProduct) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    await adminApi.deleteProduct(p.id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Productos</h1>
        <button
          onClick={openNew}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          + Nuevo producto
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.name} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl text-gray-300">📦</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="text-sm font-bold text-violet-700">{formatPrice(p.price)}</p>
              <p className="text-xs text-gray-400">
                Stock: {p.stock - p.reserved} {!p.isActive && "· inactivo"}
              </p>
              <div className="mt-1 flex gap-2 text-xs">
                <button onClick={() => openEdit(p)} className="text-violet-600">
                  Editar
                </button>
                <button onClick={() => remove(p)} className="text-red-500">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-400">Aún no tienes productos. Crea el primero.</p>
        )}
      </div>

      {/* Modal de formulario */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h2 className="mb-3 text-lg font-bold">
              {editing === "new" ? "Nuevo producto" : "Editar producto"}
            </h2>
            <div className="space-y-3">
              <Input label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Precio *" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
                <Input label="Stock *" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
              </div>
              <Input label="SKU (opcional)" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Categoría</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              {/* Imagen */}
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-700">Foto</span>
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
                    {form.imageUrl ? (
                      <Image src={form.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl text-gray-300">📦</div>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                    {uploading ? "Subiendo..." : "Subir foto"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); }} />
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <Check label="Destacado" checked={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })} />
                <Check label="Activo" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
              </div>

              {error && <p className="rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="flex-1 rounded-lg bg-gray-100 py-2 font-semibold">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving || uploading}
                  className="flex-1 rounded-lg bg-violet-600 py-2 font-semibold text-white disabled:opacity-60">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500" />
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
