import { ProductCard } from "@/components/ProductCard";
import { StoreSearch } from "@/components/store/StoreSearch";
import { StoreEmpty } from "@/components/store/StoreEmpty";
import { StoreToolbar } from "@/components/store/StoreToolbar";
import { CategoryChips } from "@/components/store/CategoryChips";
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
    <section id="catalogo" className="scroll-mt-6">
      <div className="mb-7 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <StoreSearch
          subdomain={subdomain}
          accent={accent}
          placeholder={searchPlaceholder}
          defaultValue={search}
          category={category}
        />
        <CategoryChips subdomain={subdomain} categories={categories} category={category} accent={accent} />
      </div>

      {products.length === 0 ? (
        <StoreEmpty accent={accent} message={emptyLabel} icon="🛒" />
      ) : (
        <>
        <StoreToolbar subdomain={subdomain} title={title} total={total} sort={sort} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              currency={currency}
              subdomain={subdomain}
              accent={accent}
              actionLabel={actionLabel === "Agregar" ? "Agregar al carrito" : actionLabel}
            />
          ))}
        </div>
        </>
      )}
    </section>
  );
}

