"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StoreCategory } from "@/lib/types";
import { categoryEmoji } from "@/lib/category-emoji";

/** Chips para filtrar por categoría (Todos + cada categoría). Compartido por todas las plantillas. */
export function CategoryChips({
  subdomain,
  categories,
  category,
  accent,
}: {
  subdomain: string;
  categories: StoreCategory[];
  category?: string;
  accent: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Categoría tocada: se marca al instante, sin esperar a que lleguen los productos.
  const [chosen, setChosen] = useState<string | null>(null);
  if (!categories || categories.length === 0) return null;
  const active = pending && chosen !== null ? chosen : (category ?? "");
  const go = (slug: string, href: string) => (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return; // abrir en otra pestaña
    event.preventDefault();
    if (slug === active && !pending) return;
    setChosen(slug);
    startTransition(() => router.push(href, { scroll: false }));
  };
  const chips = [
    { slug: "", href: `/tienda/${subdomain}`, label: <>🛍️ Todos</> },
    ...categories.map((c) => ({
      slug: c.slug,
      href: `/tienda/${subdomain}?category=${c.slug}`,
      label: (
        <>
          <span className="mr-1">{categoryEmoji(c.name)}</span>
          {c.name}
        </>
      ),
    })),
  ];
  return (
    <div>
      {pending && (
        // Barra de carga arriba de la pantalla mientras llegan los productos.
        <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden" style={{ backgroundColor: `${accent}33` }}>
          <div className="h-full w-1/3 animate-[chipbar_1s_ease-in-out_infinite]" style={{ backgroundColor: accent }} />
          <style>{"@keyframes chipbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}"}</style>
        </div>
      )}
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Explora por categoría</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => {
          const isActive = active === chip.slug;
          return (
            <Link
              key={chip.slug || "todos"}
              href={chip.href}
              scroll={false}
              onClick={go(chip.slug, chip.href)}
              aria-current={isActive ? "page" : undefined}
              style={
                isActive
                  ? { backgroundColor: accent, borderColor: accent, color: "#fff", boxShadow: `0 6px 16px -6px ${accent}` }
                  : { borderColor: "#e2e8f0", color: "#334155" }
              }
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {chip.label}
              {pending && isActive && (
                <span className="ml-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-label="Cargando" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
