import Image from "next/image";
import { StoreSearch } from "@/components/store/StoreSearch";
import { StoreEmpty } from "@/components/store/StoreEmpty";
import { StoreToolbar } from "@/components/store/StoreToolbar";
import { ServiceReserveButton } from "@/components/store/ServiceReserveButton";
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
  total,
  sort,
  catalogLabel,
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
  total: number;
  sort?: string;
  catalogLabel: string;
  whatsappNumber: string | null;
  storeName: string;
  search?: string;
  searchPlaceholder: string;
  emptyLabel: string;
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
        <StoreEmpty accent={accent} message={emptyLabel} icon="✦" />
      ) : (
        <>
        <StoreToolbar subdomain={subdomain} title={search ? `Resultados de "${search}"` : catalogLabel} total={total} sort={sort} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
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
                  <ServiceReserveButton
                    subdomain={subdomain}
                    storeName={storeName}
                    serviceName={p.name}
                    productId={p.id}
                    accent={accent}
                    whatsappNumber={whatsappNumber}
                    actionLabel={actionLabel}
                  />
                </div>
              </article>
          ))}
        </div>
        </>
      )}
    </>
  );
}
