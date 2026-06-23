import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { AddToCart } from "./AddToCart";

export function ProductCard({
  product,
  currency,
  subdomain,
  accent,
  actionLabel,
}: {
  product: PublicProduct;
  currency: string;
  subdomain: string;
  accent?: string;
  actionLabel?: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition hover:shadow-md">
      <Link href={`/tienda/${subdomain}/producto/${product.slug}`} className="relative block aspect-square bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">
            🛒
          </div>
        )}
        {product.isFeatured && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
            ⭐ Destacado
          </span>
        )}
        {!product.inStock && (
          <span className="absolute right-2 top-2 rounded-full bg-gray-800/80 px-2 py-0.5 text-xs font-semibold text-white">
            Agotado
          </span>
        )}
      </Link>
      <div className="p-3">
        <Link href={`/tienda/${subdomain}/producto/${product.slug}`} className="line-clamp-2 text-sm font-bold text-gray-800 hover:opacity-80">
          {product.name}
        </Link>
        <p className="mt-1 text-lg font-extrabold text-gray-900">
          {formatPrice(product.price, currency)}
        </p>
        <AddToCart product={product} accent={accent} label={actionLabel} />
      </div>
    </article>
  );
}
