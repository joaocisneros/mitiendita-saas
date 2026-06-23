import Image from "next/image";
import { AddToCart } from "@/components/AddToCart";
import { StoreSearch } from "@/components/store/StoreSearch";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

/** Plantilla Carta: platos agrupados por sección, con destacados. (Alimentos) */
export function CartaTemplate({
  subdomain,
  accent,
  actionLabel,
  currency,
  products,
  search,
  searchPlaceholder,
  emptyLabel,
}: {
  subdomain: string;
  accent: string;
  actionLabel: string;
  currency: string;
  products: PublicProduct[];
  search?: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const featured = products.filter((p) => p.isFeatured);
  const groups = new Map<string, PublicProduct[]>();
  for (const p of products) {
    const key = p.category?.name ?? "Otros";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return (
    <>
      <StoreSearch
        subdomain={subdomain}
        accent={accent}
        placeholder={searchPlaceholder}
        defaultValue={search}
      />

      {products.length === 0 ? (
        <p className="py-16 text-center text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-8">
          {featured.length > 0 && (
            <section>
              <SectionTitle accent={accent}>⭐ Destacados</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {featured.map((p) => (
                  <FeaturedDish
                    key={p.id}
                    product={p}
                    currency={currency}
                    accent={accent}
                    actionLabel={actionLabel}
                  />
                ))}
              </div>
            </section>
          )}

          {[...groups.entries()].map(([name, items]) => (
            <section key={name}>
              <SectionTitle accent={accent}>{name}</SectionTitle>
              <div className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-black/5">
                {items.map((p) => (
                  <DishRow
                    key={p.id}
                    product={p}
                    currency={currency}
                    accent={accent}
                    actionLabel={actionLabel}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
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

function DishRow({
  product,
  currency,
  accent,
  actionLabel,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl text-gray-300">🍽️</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900">{product.name}</p>
        {product.description && (
          <p className="line-clamp-2 text-xs text-slate-500">{product.description}</p>
        )}
        <p className="mt-0.5 font-extrabold" style={{ color: accent }}>
          {formatPrice(product.price, currency)}
        </p>
      </div>
      <div className="w-28 shrink-0">
        <AddToCart product={product} accent={accent} label={actionLabel} />
      </div>
    </div>
  );
}

function FeaturedDish({
  product,
  currency,
  accent,
  actionLabel,
}: {
  product: PublicProduct;
  currency: string;
  accent: string;
  actionLabel: string;
}) {
  return (
    <article className="flex gap-3 overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-gray-300">🍽️</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-bold text-slate-900">{product.name}</p>
        {product.description && (
          <p className="line-clamp-2 text-xs text-slate-500">{product.description}</p>
        )}
        <p className="mt-1 font-extrabold" style={{ color: accent }}>
          {formatPrice(product.price, currency)}
        </p>
        <div className="mt-auto pt-2">
          <AddToCart product={product} accent={accent} label={actionLabel} />
        </div>
      </div>
    </article>
  );
}
