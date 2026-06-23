import Link from "next/link";
import { notFound } from "next/navigation";
import { storefrontApi } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { resolveCategory } from "@/lib/business-categories";

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
  let products;
  try {
    [data, products] = await Promise.all([
      storefrontApi.getStore(subdomain),
      storefrontApi.getProducts(subdomain, { category, search }),
    ]);
  } catch {
    notFound();
  }

  const { store, categories } = data;
  const businessCategory = resolveCategory(store.businessType);
  // El color del rubro es el predeterminado; si el dueño personalizó su color
  // (distinto del azul por defecto), se respeta el suyo.
  const accent =
    store.primaryColor && store.primaryColor !== DEFAULT_PRIMARY
      ? store.primaryColor
      : businessCategory.theme.primary;
  const terms = businessCategory.terms;

  return (
    <div className="flex-1 bg-gray-50">
      {/* Cabecera de la tienda */}
      <header className="text-white" style={{ backgroundColor: accent }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
            {store.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold">{store.name}</h1>
            {store.description && (
              <p className="truncate text-sm text-white/80">
                {store.description}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <form className="mb-4 flex gap-2" action={`/tienda/${subdomain}`}>
          {category && <input type="hidden" name="category" value={category} />}
          <input name="search" defaultValue={search} placeholder={terms.search} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-slate-400" />
          <button style={{ backgroundColor: accent }} className="rounded-xl px-4 text-sm font-bold text-white">Buscar</button>
        </form>
        {/* Categorías */}
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

        {/* Productos */}
        {products.items.length === 0 ? (
          <p className="py-16 text-center text-gray-500">{terms.empty}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.items.map((p) => (
              <ProductCard key={p.id} product={p} currency={store.currency} subdomain={subdomain} />
            ))}
          </div>
        )}
      </main>

      {/* Botón flotante de WhatsApp */}
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
