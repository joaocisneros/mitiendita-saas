"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminCategory } from "@/lib/admin-api";
import { Overlay } from "@/components/OrderDetailModal";

export default function CategoriasPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() { adminApi.categories().then(setCategories).catch((reason) => setError(reason instanceof Error ? reason.message : "Error")); }
  useEffect(load, []);

  async function add() {
    if (name.trim().length < 2) {
      setError("Escribe el nombre de la categoría (mínimo 2 letras) antes de agregar.");
      return;
    }
    setSaving(true); setError("");
    try { await adminApi.createCategory(name.trim()); setName(""); setCreating(false); load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Error"); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editing || editName.trim().length < 2) return;
    setSaving(true); setError("");
    try { await adminApi.updateCategory(editing.id, { name: editName.trim(), isActive: editing.isActive }); setEditing(null); load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Error"); }
    finally { setSaving(false); }
  }

  async function toggle(category: AdminCategory) {
    await adminApi.updateCategory(category.id, { isActive: !category.isActive });
    load();
  }

  async function remove(category: AdminCategory) {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    try { await adminApi.deleteCategory(category.id); load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo eliminar."); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-violet-700">Catálogo</p><h1 className="mt-1 text-xl font-black text-slate-950">Categorías</h1><p className="mt-2 text-sm font-medium text-slate-600">Organiza los productos para que tus clientes encuentren todo más rápido.</p></div><button onClick={() => { setName(""); setError(""); setCreating(true); }} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">+ Nueva categoría</button></div>
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {categories.length === 0 ? <p className="p-10 text-center font-semibold text-slate-600">Aún no hay categorías.</p> : <ul className="divide-y divide-slate-200">{categories.map((category) => <li key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="font-bold text-slate-950">{category.name}</p><p className={`text-xs font-bold ${category.isActive ? "text-emerald-700" : "text-slate-600"}`}>{category.isActive ? "Visible en la tienda" : "Oculta"}</p></div><button onClick={() => toggle(category)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">{category.isActive ? "Ocultar" : "Activar"}</button><button onClick={() => { setEditing(category); setEditName(category.name); }} className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100">Editar</button><button onClick={() => remove(category)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100">Eliminar</button></li>)}</ul>}
      </div>
      {creating && <Overlay onClose={() => setCreating(false)}><h2 className="text-xl font-black text-slate-950">Nueva categoría</h2><p className="mt-1 text-sm text-slate-500">Escribe cómo deseas agrupar tus productos en la tienda.</p><label className="mt-4 block"><span className="mb-1.5 block text-sm font-bold text-slate-800">Nombre de la categoría</span><input autoFocus value={name} onChange={(event) => { setName(event.target.value); if (error) setError(""); }} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="Ej: Perfumes, Ropa o Bebidas" className="h-11 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-600" /></label>{error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}<div className="mt-5 flex gap-2"><button onClick={() => setCreating(false)} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700">Cancelar</button><button onClick={add} disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white disabled:opacity-60">{saving ? "Guardando..." : "Crear categoría"}</button></div></Overlay>}
      {editing && <Overlay onClose={() => setEditing(null)}><h2 className="text-xl font-black text-slate-950">Editar categoría</h2><p className="mt-1 text-sm text-slate-500">Cambia el nombre que verán tus clientes.</p><label className="mt-4 block"><span className="mb-1.5 block text-sm font-bold text-slate-800">Nombre de la categoría</span><input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveEdit()} className="h-11 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-950 outline-none focus:border-violet-600" /></label>{error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}<div className="mt-5 flex gap-2"><button onClick={() => setEditing(null)} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-700">Cancelar</button><button onClick={saveEdit} disabled={saving} className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white disabled:opacity-60">{saving ? "Guardando..." : "Guardar cambios"}</button></div></Overlay>}
    </div>
  );
}
