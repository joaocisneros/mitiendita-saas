import Image from "next/image";
import type { PublicProduct } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { AddToCart } from "./AddToCart";

export function ProductCard({
  product,
  currency,
}: {
  product: PublicProduct;
  currency: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition hover:shadow-md">
      <div className="relative aspect-square bg-gray-100">
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
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-800">
          {product.name}
        </h3>
        <p className="mt-1 text-lg font-extrabold text-gray-900">
          {formatPrice(product.price, currency)}
        </p>
        <AddToCart product={product} />
      </div>
    </article>
  );
}
