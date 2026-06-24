"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "featured", label: "Destacados" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "newest", label: "Más nuevos" },
  { value: "name", label: "Nombre (A-Z)" },
];

/** Selector "Ordenar por" que actualiza ?sort= conservando categoría/búsqueda. */
export function SortSelect({ subdomain, value }: { subdomain: string; value?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(sort: string) {
    const q = new URLSearchParams(params.toString());
    if (sort && sort !== "featured") q.set("sort", sort);
    else q.delete("sort");
    const qs = q.toString();
    router.push(`/tienda/${subdomain}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden font-medium text-slate-600 sm:inline">Ordenar por:</span>
      <select
        value={value ?? "featured"}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
