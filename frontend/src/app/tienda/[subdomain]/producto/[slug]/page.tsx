import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storefrontApi } from "@/lib/api";
import { actionOf, archetypeOf, resolveCategory, storeAccent } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";
import { AddToCart } from "@/components/AddToCart";
import { ServiceReserveButton } from "@/components/store/ServiceReserveButton";
import { SubscribeButton } from "@/components/store/SubscribeButton";
import { ShareButton } from "@/components/store/ShareButton";

/** Vista previa al compartir el link de un producto. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string; slug: string }>;
}): Promise<Metadata> {
  const { subdomain, slug } = await params;
  try {
    const product = await storefrontApi.getProduct(subdomain, slug);
    const description = product.description || `Disponible en la tienda. ${product.name}.`;
    const images = product.imageUrl ? [{ url: product.imageUrl }] : undefined;
    return {
      title: product.name,
      description,
      openGraph: { title: product.name, description, images, type: "website" },
      twitter: { card: "summary_large_image", title: product.name, description, images: product.imageUrl ? [product.imageUrl] : undefined },
    };
  } catch {
    return { title: "Producto" };
  }
}
export default async function ProductDetailPage({ params }: { params: Promise<{ subdomain: string; slug: string }> }) {
  const { subdomain, slug } = await params;
  let product;
  let store;
  try {
    [product, store] = await Promise.all([storefrontApi.getProduct(subdomain, slug), storefrontApi.getStore(subdomain)]);
  } catch { notFound(); }
  const accent = storeAccent(store.store);

  // Según el tipo de negocio: carrito (Comercio/Alimentos) o reserva por WhatsApp.
  const businessCategory = resolveCategory(store.store.businessType);
  const archetype = archetypeOf(businessCategory);
  const usesCart = archetype === "catalogo" || archetype === "carta";
  const action = actionOf(businessCategory);
  const phone = store.store.whatsappNumber?.replace(/\D/g, "");
  const reserveHref = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${store.store.name}, quiero ${action.toLowerCase()}: ${product.name}`)}`
    : null;

  return (
    <div className="min-h-screen flex-1 bg-slate-50 pb-24">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4"><Link href={`/tienda/${subdomain}`} className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-700">←</Link><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{store.store.name}</p><h1 className="font-black text-slate-950">Detalle del producto</h1></div></div></header>
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" priority /> : <div className="flex h-full items-center justify-center text-7xl text-slate-300">□</div>}{product.isFeatured && <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">Destacado</span>}</div>
        <section className="self-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">{product.category && <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>{product.category.name}</p>}<h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{product.name}</h2><p className="mt-3 text-3xl font-black" style={{ color: accent }}>{formatPrice(product.price, store.store.currency)}</p><p className={`mt-2 text-sm font-bold ${product.inStock ? "text-emerald-700" : "text-red-700"}`}>{product.inStock ? `${product.available} disponibles` : "Producto agotado"}</p>{product.description ? <p className="mt-5 whitespace-pre-line text-sm font-medium leading-6 text-slate-700">{product.description}</p> : <p className="mt-5 text-sm font-medium text-slate-500">Sin descripción adicional.</p>}<div className="mt-7">{usesCart ? (<AddToCart product={product} accent={accent} />) : archetype === "digital" ? (<SubscribeButton subdomain={subdomain} storeName={store.store.name} planName={product.name} productId={product.id} accent={accent} whatsappNumber={store.store.whatsappNumber} actionLabel={action} />) : archetype === "servicios" ? (<ServiceReserveButton subdomain={subdomain} storeName={store.store.name} serviceName={product.name} productId={product.id} accent={accent} whatsappNumber={store.store.whatsappNumber} actionLabel={action} />) : reserveHref ? (<a href={reserveHref} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white transition hover:bg-green-600">💬 {action} por WhatsApp</a>) : (<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-700">Este negocio aún no cargó su WhatsApp.</div>)}<ShareButton title={product.name} accent={accent} /></div><p className="mt-4 text-center text-xs font-medium text-slate-500">{usesCart ? "El precio y el stock se validarán al confirmar el pedido." : archetype === "digital" ? "El negocio activará tu suscripción y coordinará el pago por WhatsApp." : "El negocio confirmará tu cita y coordinará por WhatsApp."}</p></section>
      </main>
    </div>
  );
}
