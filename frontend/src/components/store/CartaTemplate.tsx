import { ProductCard } from "@/components/ProductCard";
import { StoreSearch } from "@/components/store/StoreSearch";
import { StoreEmpty } from "@/components/store/StoreEmpty";
import { StoreToolbar } from "@/components/store/StoreToolbar";
import type { PublicProduct } from "@/lib/types";

/** Plantilla Carta: platos en tarjetas con foto grande, agrupados por sección. (Alimentos) */
export function CartaTemplate({
  subdomain,
  accent,
  actionLabel,
  currency,
  products,
  total,
  sort,
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
  search?: string;
  searchPlaceholder: string;
  catalogLabel: string;
  emptyLabel: string;
}) {
  const featured = products.filter((p) => p.isFeatured);
  const groups = new Map<string, PublicProduct[]>();
  for (const p of products) {
    const key = p.category?.name ?? "Otros";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const sections: { id: string; label: string; items: PublicProduct[] }[] = [];
  if (featured.length > 0) sections.push({ id: "destacados", label: "⭐ Destacados", items: featured });
  let gi = 0;
  for (const [name, items] of groups) sections.push({ id: `sec-${gi++}`, label: name, items });

  return (
    <>
      <StoreSearch
        subdomain={subdomain}
        accent={accent}
        placeholder={searchPlaceholder}
        defaultValue={search}
      />

      {products.length === 0 ? (
        <StoreEmpty accent={accent} message={emptyLabel} icon="🍽️" />
      ) : (
        <>
        <StoreToolbar subdomain={subdomain} title={search ? `Resultados de "${search}"` : catalogLabel} total={total} sort={sort} />

        {sections.length > 1 && (
          <nav className="sticky top-0 z-20 -mx-4 mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 bg-gray-50/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-black/10 transition hover:bg-slate-100"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        <div className="space-y-9">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <SectionTitle accent={accent}>{s.label}</SectionTitle>
              <DishGrid>
                {s.items.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    currency={currency}
                    subdomain={subdomain}
                    accent={accent}
                    actionLabel={actionLabel}
                    placeholderIcon="🍽️"
                  />
                ))}
              </DishGrid>
            </section>
          ))}
        </div>
        </>
      )}
    </>
  );
}

function DishGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}

function SectionTitle({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
      <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
      {children}
    </h2>
  );
}
