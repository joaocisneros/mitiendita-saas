import Link from "next/link";
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
  if (!categories || categories.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Explora por categoría</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip href={`/tienda/${subdomain}`} active={!category} accent={accent}>🛍️ Todos</Chip>
        {categories.map((c) => (
          <Chip key={c.id} href={`/tienda/${subdomain}?category=${c.slug}`} active={category === c.slug} accent={accent}>
            <span className="mr-1">{categoryEmoji(c.name)}</span>{c.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  href,
  active,
  accent,
  children,
}: {
  href: string;
  active: boolean;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      style={
        active
          ? { backgroundColor: accent, borderColor: accent, color: "#fff", boxShadow: `0 6px 16px -6px ${accent}` }
          : { borderColor: "#e2e8f0", color: "#334155" }
      }
      className="shrink-0 whitespace-nowrap rounded-full border bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {children}
    </Link>
  );
}
