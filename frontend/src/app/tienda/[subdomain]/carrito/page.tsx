"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { storefrontApi } from "@/lib/api";
import { storeAccent } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { items, setQty, remove, subtotal } = useCart();
  const [accent, setAccent] = useState("#0f172a");

  useEffect(() => {
    storefrontApi
      .getStore(subdomain)
      .then((d) => setAccent(storeAccent(d.store)))
      .catch(() => {});
  }, [subdomain]);

  return (
    <div className="min-h-full flex-1 bg-gray-50 pb-28">
      <header style={{ backgroundColor: accent }} className="px-4 py-4 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={`/tienda/${subdomain}`} className="text-2xl">
            ←
          </Link>
          <h1 className="text-lg font-bold">Mi carrito</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-5xl">🛒</p>
            <p className="mt-4 text-gray-500">Tu carrito está vacío.</p>
            <Link
              href={`/tienda/${subdomain}`}
              style={{ backgroundColor: accent }}
              className="mt-4 inline-block rounded-full px-5 py-2 font-semibold text-white"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((it) => (
                <li
                  key={it.productId}
                  className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {it.imageUrl ? (
                      <Image
                        src={it.imageUrl}
                        alt={it.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl text-gray-300">
                        🛒
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <p className="text-sm font-bold" style={{ color: accent }}>
                      {formatPrice(it.price)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => setQty(it.productId, it.quantity - 1)}
                        className="h-7 w-7 rounded-md bg-gray-100 font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => setQty(it.productId, it.quantity + 1)}
                        className="h-7 w-7 rounded-md bg-gray-100 font-bold"
                      >
                        +
                      </button>
                      <button
                        onClick={() => remove(it.productId)}
                        className="ml-auto text-sm text-red-500"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold">
                    {formatPrice(Number(it.price) * it.quantity)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-xl font-extrabold">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Link
              href={`/tienda/${subdomain}/checkout`}
              style={{ backgroundColor: accent }}
              className="mt-4 block w-full rounded-full py-3 text-center font-semibold text-white transition hover:opacity-90"
            >
              Continuar al pago →
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
