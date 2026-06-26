import Image from "next/image";
import { StoreSearch } from "@/components/store/StoreSearch";
import { StoreEmpty } from "@/components/store/StoreEmpty";
import { StoreToolbar } from "@/components/store/StoreToolbar";
import { SubscribeButton } from "@/components/store/SubscribeButton";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

function splitPlanDescription(description?: string | null) {
  const raw = description ?? "";
  const [short = "", rest = ""] = raw.split(/\n---\n/);
  if (raw.includes("\n---\n")) {
    return {
      shortDescription: short.trim(),
      benefits: rest
        .split(/\n|·|•/)
        .map((feature) => feature.trim())
        .filter(Boolean),
    };
  }
  return {
    shortDescription: "",
    benefits: raw
      .split(/\n|·|•/)
      .map((feature) => feature.trim())
      .filter(Boolean),
  };
}

/**
 * Plantilla digital/telecom: tarjetas de planes con solicitud, Yape,
 * comprobante y activación.
 */
export function DigitalTemplate({
  subdomain,
  accent,
  actionLabel,
  currency,
  products,
  total,
  sort,
  catalogLabel,
  whatsappNumber,
  storeName,
  search,
  searchPlaceholder,
  emptyLabel,
  yapeQrUrl,
  yapeHolderName,
  yapeNumber,
}: {
  subdomain: string;
  accent: string;
  actionLabel: string;
  currency: string;
  products: PublicProduct[];
  total: number;
  sort?: string;
  catalogLabel: string;
  whatsappNumber: string | null;
  storeName: string;
  search?: string;
  searchPlaceholder: string;
  emptyLabel: string;
  yapeQrUrl?: string | null;
  yapeHolderName?: string | null;
  yapeNumber?: string | null;
}) {
  return (
    <>
      <StoreSearch
        subdomain={subdomain}
        accent={accent}
        placeholder={searchPlaceholder}
        defaultValue={search}
      />

      {products.length === 0 ? (
        <StoreEmpty accent={accent} message={emptyLabel} icon="🎬" />
      ) : (
        <>
          <StoreToolbar
            subdomain={subdomain}
            title={search ? `Resultados de "${search}"` : catalogLabel}
            total={total}
            sort={sort}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const { shortDescription, benefits } = splitPlanDescription(product.description);
              return (
                <article
                  key={product.id}
                  className={`flex flex-col rounded-2xl bg-white p-5 ring-1 transition hover:shadow-lg ${
                    product.isFeatured ? "ring-2" : "ring-black/5"
                  }`}
                  style={product.isFeatured ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}` } : undefined}
                >
                  {product.imageUrl && (
                    <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-slate-100">
                      <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover" />
                    </div>
                  )}
                  {product.isFeatured ? (
                    <span
                      className="mb-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Más popular
                    </span>
                  ) : (
                    <span className="mb-2 w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Plan
                    </span>
                  )}
                  <h3 className="text-lg font-black text-slate-900">{product.name}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-black" style={{ color: accent }}>
                      {formatPrice(product.price, currency)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500"> / mes</span>
                  </p>

                  {shortDescription && (
                    <p className="mt-3 text-sm font-medium leading-5 text-slate-600">
                      {shortDescription}
                    </p>
                  )}

                  {benefits.length > 0 && (
                    <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                      {benefits.map((feature, index) => (
                        <li key={index} className="flex gap-2">
                          <span style={{ color: accent }}>✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto">
                    <SubscribeButton
                      subdomain={subdomain}
                      storeName={storeName}
                      planName={product.name}
                      productId={product.id}
                      accent={accent}
                      whatsappNumber={whatsappNumber}
                      actionLabel={actionLabel}
                      price={product.price}
                      currency={currency}
                      yapeQrUrl={yapeQrUrl}
                      yapeHolderName={yapeHolderName}
                      yapeNumber={yapeNumber}
                    />
                    <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
                      Solicitud · validación · activación
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
