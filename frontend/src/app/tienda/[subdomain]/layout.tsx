import { CartProvider } from "@/lib/cart-context";
import { CartButton } from "@/components/CartButton";
import { CartToast } from "@/components/store/CartToast";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  return (
    <CartProvider storeKey={subdomain}>
      {children}
      <CartButton subdomain={subdomain} />
      <CartToast />
    </CartProvider>
  );
}
