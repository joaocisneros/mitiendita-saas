"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminCategory } from "@/lib/admin-api";

export default function CategoriasPage() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    adminApi.categories().then(setCats).catch(() => {});
  }
  useEffect(load, []);

  async function add() {
    if (name.trim().length < 2) return;
    setSaving(true);
    setError("");
    try {
      await adminApi.createCategory(name.trim());
      setName("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: AdminCategory) {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    await adminApi.deleteCategory(c.id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Categorías</h1>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nueva categoría (ej: Bebidas)"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-violet-500"
        />
        <button
          onClick={add}
          disabled={saving}
          className="rounded-lg bg-violet-600 px-4 font-semibold text-white disabled:opacity-60"
        >
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {cats.length === 0 ? (
          <p className="p-6 text-center text-gray-400">Aún no hay categorías.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {cats.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{c.name}</span>
                <button onClick={() => remove(c)} className="text-sm text-red-500">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
