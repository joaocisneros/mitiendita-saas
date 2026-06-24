import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { StoreSearch } from "@/components/store/StoreSearch";
import { StoreEmpty } from "@/components/store/StoreEmpty";
import { StoreToolbar } from "@/components/store/StoreToolbar";
import type { PublicProduct, StoreCategory } from "@/lib/types";

/** Plantilla Catálogo: grilla de productos + filtros por categoría. (Comercio) */
export function CatalogTemplate({
  subdomain,
  accent,
  actionLabel,
  currency,
  products,
  total,
  sort,
  categories,
  category,
  search,
  searchPlaceholder,
  catalogLabel,
  emptyLabel,
}: {
  subdomain: string;
  accent: string;
  actionLabel: string;
  currency: string;
  products: PublicProduct[];
  total: number;
  sort?: string;
  categories: StoreCategory[];
  category?: string;
  search?: string;
  searchPlaceholder: string;
  catalogLabel: string;
  emptyLabel: string;
}) {
  const activeName = category ? categories.find((c) => c.slug === category)?.name : undefined;
  const title = search ? `Resultados de "${search}"` : (activeName ?? catalogLabel);
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
        <StoreEmpty accent={accent} message={emptyLabel} icon="🛒" />
      ) : (
        <>
        <StoreToolbar subdomain={subdomain} title={title} total={total} sort={sort} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
        </>
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
