import Image from "next/image";
import Link from "next/link";
import { StoreSearch } from "@/components/store/StoreSearch";
import { StoreEmpty } from "@/components/store/StoreEmpty";
import { formatPrice } from "@/lib/format";
import type { PublicProduct } from "@/lib/types";

/**
 * Plantilla Servicios: tarjetas de servicio con acción de consulta/reserva por
 * WhatsApp (sin carrito). Para Belleza, Salud, Turismo, Automotriz, Educación…
 */
export function ServiciosTemplate({
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
        <StoreEmpty accent={accent} message={emptyLabel} icon="✦" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => {
            const message = encodeURIComponent(
              `Hola ${storeName}, quiero ${actionLabel.toLowerCase()}: ${p.name}`,
            );
            const href = phone
              ? `https://wa.me/${phone}?text=${message}`
              : `/tienda/${subdomain}/producto/${p.slug}`;
            return (
              <article
                key={p.id}
                className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition hover:shadow-md"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.name} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-2xl"
                      style={{ color: accent }}
                    >
                      ✦
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  {p.description && (
                    <p className="line-clamp-2 text-xs text-slate-500">{p.description}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Desde{" "}
                    <span className="font-extrabold" style={{ color: accent }}>
                      {formatPrice(p.price, currency)}
                    </span>
                  </p>
                  <Link
                    href={href}
                    target={phone ? "_blank" : undefined}
                    rel={phone ? "noopener noreferrer" : undefined}
                    style={{ backgroundColor: accent }}
                    className="mt-auto inline-flex w-full items-center justify-center rounded-lg py-2 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    {phone ? `${actionLabel} por WhatsApp` : actionLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
