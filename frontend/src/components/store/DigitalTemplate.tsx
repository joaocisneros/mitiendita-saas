import Link from "next/link";
import { StoreSearch } from "@/components/store/StoreSearch";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

/**
 * Plantilla Digital: tarjetas de planes/membresías con acceso vía WhatsApp.
 * Para Streaming, cursos, membresías, contenido premium.
 */
export function DigitalTemplate({
  subdomain,
  accent,
  actionLabel,
  currency,
  products,
  whatsappNumber,
  storeName,
  search,
  searchPlaceholder,
  emptyLabel,
}: {
  subdomain: string;
  accent: string;
  actionLabel: string;
  currency: string;
  products: PublicProduct[];
  whatsappNumber: string | null;
  storeName: string;
  search?: string;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const phone = whatsappNumber?.replace(/[^0-9]/g, "");

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const features = (p.description ?? "")
              .split(/\n|·|•/)
              .map((f) => f.trim())
              .filter(Boolean);
            const message = encodeURIComponent(
              `Hola ${storeName}, quiero ${actionLabel.toLowerCase()}: ${p.name}`,
            );
            const href = phone
              ? `https://wa.me/${phone}?text=${message}`
              : `/tienda/${subdomain}/producto/${p.slug}`;
            return (
              <article
                key={p.id}
                className={`flex flex-col rounded-2xl bg-white p-5 ring-1 transition hover:shadow-lg ${
                  p.isFeatured ? "ring-2" : "ring-black/5"
                }`}
                style={p.isFeatured ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}` } : undefined}
              >
                {p.isFeatured && (
                  <span
                    className="mb-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Más popular
                  </span>
                )}
                <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-black" style={{ color: accent }}>
                    {formatPrice(p.price, currency)}
                  </span>
                  <span className="text-sm font-semibold text-slate-500"> / mes</span>
                </p>
                {features.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                    {features.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span style={{ color: accent }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={href}
                  target={phone ? "_blank" : undefined}
                  rel={phone ? "noopener noreferrer" : undefined}
                  style={{ backgroundColor: accent }}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  {actionLabel}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
