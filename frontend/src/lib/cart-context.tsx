"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: string;
  imageUrl: string | null;
  available?: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  storeKey,
  children,
}: {
  storeKey: string;
  children: React.ReactNode;
}) {
  const KEY = `mitiendita_cart_${storeKey}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Cargar carrito guardado.
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) setItems(JSON.parse(raw) as CartItem[]);
      } catch {
        /* ignorar */
      }
      setLoaded(true);
    });
  }, [KEY]);

  // Guardar cambios.
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded, KEY]);

  const add = (item: Omit<CartItem, "quantity">, qty = 1) =>
    setItems((prev) => {
      const found = prev.find((p) => p.productId === item.productId);
      if (found) {
        return prev.map((p) =>
          p.productId === item.productId
            ? { ...p, quantity: p.quantity + qty }
            : p,
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });

  const setQty = (productId: string, qty: number) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.productId !== productId)
        : prev.map((p) =>
            p.productId === productId
              ? { ...p, quantity: Math.min(qty, p.available ?? qty) }
              : p,
          ),
    );

  const remove = (productId: string) =>
    setItems((prev) => prev.filter((p) => p.productId !== productId));

  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, add, setQty, remove, clear, count, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
