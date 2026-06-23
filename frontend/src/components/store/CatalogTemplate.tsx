import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { StoreSearch } from "@/components/store/StoreSearch";
import type { PublicProduct, StoreCategory } from "@/lib/types";

/** Plantilla Catálogo: grilla de productos + filtros por categoría. (Comercio) */
export function CatalogTemplate({
  subdomain,
  accent,
  actionLabel,
  currency,
  products,
  categories,
  category,
  search,
  searchPlaceholder,
  emptyLabel,
}: {
  subdomain: string;
  accent: string;
  actionLabel: string;
  currency: string;
  products: PublicProduct[];
  categories: StoreCategory[];
  category?: string;
  search?: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  return (
    <>
      <StoreSearch
        subdomain={subdomain}
        accent={accent}
        placeholder={searchPlaceholder}
        defaultValue={search}
        category={category}
      />

      {categories.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <Chip href={`/tienda/${subdomain}`} active={!category} accent={accent}>
            Todos
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              href={`/tienda/${subdomain}?category=${c.slug}`}
              active={category === c.slug}
              accent={accent}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="py-16 text-center text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              currency={currency}
              subdomain={subdomain}
              accent={accent}
              actionLabel={actionLabel}
            />
          ))}
        </div>
      )}
    </>
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
      style={active ? { backgroundColor: accent } : undefined}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "text-white"
          : "bg-white text-gray-700 ring-1 ring-black/10 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}
