import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storefrontApi } from "@/lib/api";
import {
  actionOf,
  archetypeOf,
  heroOf,
  resolveCategory,
} from "@/lib/business-categories";
import { CatalogTemplate } from "@/components/store/CatalogTemplate";
import { CartaTemplate } from "@/components/store/CartaTemplate";
import { ServiciosTemplate } from "@/components/store/ServiciosTemplate";
import { DigitalTemplate } from "@/components/store/DigitalTemplate";
import { HeaderCartIcon } from "@/components/store/HeaderCartIcon";
import { StoreFooter } from "@/components/store/StoreFooter";

const DEFAULT_PRIMARY = "#2563eb";

/** Vista previa al compartir el link de la tienda (WhatsApp, redes). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  try {
    const { store } = await storefrontApi.getStore(subdomain);
    const title = store.name;
    const description =
      store.description || `Conoce ${store.name}: haz tu pedido o reserva por internet, fácil y rápido.`;
    const images = store.logoUrl ? [{ url: store.logoUrl }] : undefined;
    return {
      title,
      description,
      openGraph: { title, description, images, type: "website" },
      twitter: {
        card: "summary",
        title,
        description,
        images: store.logoUrl ? [store.logoUrl] : undefined,
      },
    };
  } catch {
    return { title: "Tienda" };
  }
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ category?: string; search?: string; sort?: string }>;
}) {
  const { subdomain } = await params;
  const { category, search, sort } = await searchParams;

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
  // Solo los rubros que venden con carrito muestran el ícono de carrito.
  const usesCart = archetype === "catalogo" || archetype === "carta";
  const hero = heroOf(archetype, businessCategory.id);
  // Fondo con personalidad propia de cada rubro (cálido para comida, etc.).
  const surface = {
    catalogo: "#f8fafc", // limpio, comercial
    carta: "#fff7ed",    // cálido, apetitoso
    servicios: "#fdf4ff",// suave, cuidado personal
    digital: "#f5f3ff",  // premium, tecnológico
  }[archetype];

  let products;
  try {
    products =
      archetype === "catalogo"
        ? await storefrontApi.getProducts(subdomain, { category, search, sort })
        : await storefrontApi.getProducts(subdomain, { search, limit: 100, sort });
  } catch {
    notFound();
  }

  return (
    <div className="flex-1" style={{ backgroundColor: surface }}>
      <header
        className="relative overflow-hidden text-white"
        style={{ backgroundImage: `linear-gradient(135deg, ${accent}, ${accent}dd 55%, ${businessCategory.theme.secondary})` }}
      >
        {/* Brillos decorativos para dar profundidad */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/20 text-3xl font-black shadow-xl ring-1 ring-white/30 backdrop-blur">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                store.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
                {businessCategory.emoji} {businessCategory.label}
              </span>
              <h1 className="mt-1.5 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{store.name}</h1>
              <p className="mt-0.5 line-clamp-1 text-sm text-white/85">
                {store.description || hero.tagline}
              </p>
            </div>
            {usesCart && (
              <div className="ml-auto">
                <HeaderCartIcon />
              </div>
            )}
          </div>

          {/* Sellos de confianza (Delivery/Recojo/Yape solo en negocios físicos) */}
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            {store.whatsappNumber && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">💬 Atención por WhatsApp</span>
            )}
            {usesCart && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">🔒 Pago seguro con Yape</span>
            )}
            {usesCart && store.allowsDelivery && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">🚚 Delivery a domicilio</span>
            )}
            {usesCart && store.allowsPickup && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">🏪 Recojo en tienda</span>
            )}
            {archetype === "servicios" && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">📅 Reserva fácil</span>
            )}
            {archetype === "digital" && (
              <span className="rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/20">⚡ Activación rápida</span>
            )}
          </div>

          {/* Llamada a la acción propia del tipo de negocio */}
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-extrabold shadow-md" style={{ color: accent }}>
            {hero.cta}
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-[1440px] rounded-t-[2rem] px-4 pb-32 pt-6 sm:px-6 lg:px-8" style={{ backgroundColor: surface }}>
        {archetype === "catalogo" && (
          <CatalogTemplate
            subdomain={subdomain}
            accent={accent}
            actionLabel={action}
            currency={store.currency}
            products={products.items}
            total={products.total}
            sort={sort}
            categories={categories}
            category={category}
            search={search}
            searchPlaceholder={terms.search}
            catalogLabel={terms.catalog}
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
            total={products.total}
            sort={sort}
            search={search}
            searchPlaceholder={terms.search}
            catalogLabel={terms.catalog}
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
            total={products.total}
            sort={sort}
            catalogLabel={terms.catalog}
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
            total={products.total}
            sort={sort}
            catalogLabel={terms.catalog}
            whatsappNumber={store.whatsappNumber}
            storeName={store.name}
            search={search}
            searchPlaceholder={terms.search}
            emptyLabel={terms.empty}
          />
        )}
      </main>

      <StoreFooter store={store} />

      {store.whatsappNumber && (
        <a
          href={`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg transition hover:bg-green-600"
          aria-label="Escribir por WhatsApp"
        >
          💬
        </a>
      )}
    </div>
  );
}
