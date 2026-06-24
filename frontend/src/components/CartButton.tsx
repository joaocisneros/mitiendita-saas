"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { storefrontApi } from "@/lib/api";
import { storeAccent, resolveCategory, archetypeOf } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";
import { CheckoutModal } from "@/components/store/CheckoutModal";

/**
 * Carrito en la misma pantalla: barra fija + panel deslizante (drawer).
 * El pago (checkout) sí navega a otra pantalla.
 */
export function CartButton({ subdomain }: { subdomain: string }) {
  const { items, setQty, remove, count, subtotal, isOpen, openCart, closeCart } = useCart();
  const pathname = usePathname();
  const [accent, setAccent] = useState("#0f172a");
  const [usesCart, setUsesCart] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    storefrontApi
      .getStore(subdomain)
      .then((d) => {
        setAccent(storeAccent(d.store));
        const arch = archetypeOf(resolveCategory(d.store.businessType));
        setUsesCart(arch === "catalogo" || arch === "carta");
      })
      .catch(() => {});
  }, [subdomain]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  // No mostrar el carrito dentro del pago / confirmación, ni en rubros sin carrito.
  const onCheckoutFlow = /\/(checkout|pedido)(\/|$)/.test(pathname);
  if (onCheckoutFlow || !usesCart) return null;

  return (
    <>
      {/* Barra fija (estilo delivery) */}
      {count > 0 && !isOpen && !paying && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={openCart}
            style={{ backgroundColor: accent }}
            className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-white shadow-2xl shadow-black/25 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5 text-[15px] font-bold">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/25 px-2 text-sm font-black">
                {count}
              </span>
              Ver carrito
            </span>
            <span className="flex items-center gap-2 text-[15px] font-black">
              {formatPrice(subtotal)}
              <span className="text-lg leading-none">→</span>
            </span>
          </button>
        </div>
      )}

      {/* Drawer del carrito (misma pantalla) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-950/50" onClick={closeCart} />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">
                Tu carrito{count > 0 && <span className="font-bold text-slate-400"> ({count})</span>}
              </h2>
              <button
                onClick={closeCart}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-5xl">🛒</p>
                <p className="font-semibold text-slate-600">Tu carrito está vacío.</p>
                <button
                  onClick={closeCart}
                  style={{ backgroundColor: accent }}
                  className="rounded-full px-5 py-2 font-bold text-white"
                >
                  Seguir comprando
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto p-4">
                  {items.map((it) => (
                    <li key={it.productId} className="flex gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-black/5">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {it.imageUrl ? (
                          <Image src={it.imageUrl} alt={it.name} fill sizes="64px" className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl text-gray-300">🛒</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{it.name}</p>
                        <p className="text-sm font-extrabold" style={{ color: accent }}>
                          {formatPrice(it.price)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={() => setQty(it.productId, it.quantity - 1)}
                            className="h-7 w-7 rounded-md bg-white font-bold text-slate-700 ring-1 ring-slate-200"
                            aria-label="Quitar uno"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-semibold">{it.quantity}</span>
                          <button
                            onClick={() => setQty(it.productId, it.quantity + 1)}
                            className="h-7 w-7 rounded-md bg-white font-bold text-slate-700 ring-1 ring-slate-200"
                            aria-label="Agregar uno"
                          >
                            +
                          </button>
                          <button
                            onClick={() => remove(it.productId)}
                            className="ml-auto text-xs font-semibold text-red-500 hover:text-red-600"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm font-bold text-slate-900">
                        {formatPrice(Number(it.price) * it.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="text-xl font-black text-slate-950">{formatPrice(subtotal)}</span>
                  </div>
                  <button
                    onClick={() => { closeCart(); setPaying(true); }}
                    style={{ backgroundColor: accent }}
                    className="block w-full rounded-full py-3 text-center font-bold text-white transition hover:opacity-90"
                  >
                    Continuar al pago →
                  </button>
                  <button
                    onClick={closeCart}
                    className="mt-2 block w-full py-1 text-center text-sm font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Seguir comprando
                  </button>
                </footer>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Pago en modal centrado */}
      {paying && <CheckoutModal subdomain={subdomain} onClose={() => setPaying(false)} />}
    </>
  );
}
