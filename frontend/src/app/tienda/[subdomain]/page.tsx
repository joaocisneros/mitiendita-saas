import { notFound } from "next/navigation";
import { storefrontApi } from "@/lib/api";
import {
  actionOf,
  archetypeOf,
  resolveCategory,
} from "@/lib/business-categories";
import { CatalogTemplate } from "@/components/store/CatalogTemplate";
import { CartaTemplate } from "@/components/store/CartaTemplate";
import { ServiciosTemplate } from "@/components/store/ServiciosTemplate";
import { DigitalTemplate } from "@/components/store/DigitalTemplate";

const DEFAULT_PRIMARY = "#2563eb";

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { subdomain } = await params;
  const { category, search } = await searchParams;

  let data;
  try {
    data = await storefrontApi.getStore(subdomain);
  } catch {
    notFound();
  }
  const { store, categories } = data;

  const businessCategory = resolveCategory(store.businessType);
  const archetype = archetypeOf(businessCategory);
  // El catálogo filtra por categoría/búsqueda; el resto muestra todo el listado.
  const accent =
    store.primaryColor && store.primaryColor !== DEFAULT_PRIMARY
      ? store.primaryColor
      : businessCategory.theme.primary;
  const terms = businessCategory.terms;
  const action = actionOf(businessCategory);

  let products;
  try {
    products =
      archetype === "catalogo"
        ? await storefrontApi.getProducts(subdomain, { category, search })
        : await storefrontApi.getProducts(subdomain, { search, limit: 100 });
  } catch {
    notFound();
  }

  return (
    <div className="flex-1 bg-gray-50">
      <header className="text-white" style={{ backgroundColor: accent }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
            {store.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">
              {businessCategory.emoji} {businessCategory.label}
            </p>
            <h1 className="truncate text-lg font-extrabold">{store.name}</h1>
            {store.description && (
              <p className="truncate text-sm text-white/80">{store.description}</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {archetype === "catalogo" && (
          <CatalogTemplate
            subdomain={subdomain}
            accent={accent}
            actionLabel={action}
            currency={store.currency}
            products={products.items}
            categories={categories}
            category={category}
            search={search}
            searchPlaceholder={terms.search}
            emptyLabel={terms.empty}
          />
        )}
        {archetype === "carta" && (
          <CartaTemplate
            subdomain={subdomain}
            accent={accent}
            actionLabel={action}
            currency={store.currency}
            products={products.items}
            search={search}
            searchPlaceholder={terms.search}
            emptyLabel={terms.empty}
          />
        )}
        {archetype === "servicios" && (
          <ServiciosTemplate
            subdomain={subdomain}
            accent={accent}
            actionLabel={action}
            currency={store.currency}
            products={products.items}
            whatsappNumber={store.whatsappNumber}
            storeName={store.name}
            search={search}
            searchPlaceholder={terms.search}
            emptyLabel={terms.empty}
          />
        )}
        {archetype === "digital" && (
          <DigitalTemplate
            subdomain={subdomain}
            accent={accent}
            actionLabel={action}
            currency={store.currency}
            products={products.items}
            whatsappNumber={store.whatsappNumber}
            storeName={store.name}
            search={search}
            searchPlaceholder={terms.search}
            emptyLabel={terms.empty}
          />
        )}
      </main>

      {store.whatsappNumber && (
        <a
          href={`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg transition hover:bg-green-600"
          aria-label="Escribir por WhatsApp"
        >
          💬
        </a>
      )}
    </div>
  );
}
