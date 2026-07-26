import Link from "next/link";
import type { StoreCategory } from "@/lib/types";

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
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      <Chip href={`/tienda/${subdomain}`} active={!category} accent={accent}>Todos</Chip>
      {categories.map((c) => (
        <Chip key={c.id} href={`/tienda/${subdomain}?category=${c.slug}`} active={category === c.slug} accent={accent}>
          {c.name}
        </Chip>
      ))}
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
      style={active ? { backgroundColor: accent, borderColor: accent, color: "#fff" } : { borderColor: "#e2e8f0", color: "#334155" }}
      className="shrink-0 whitespace-nowrap rounded-full border-2 bg-white px-4 py-1.5 text-sm font-bold transition hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}
