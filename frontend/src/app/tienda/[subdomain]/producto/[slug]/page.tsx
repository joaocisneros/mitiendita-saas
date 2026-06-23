import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { storefrontApi } from "@/lib/api";
import { storeAccent } from "@/lib/business-categories";
import { formatPrice } from "@/lib/format";
import { AddToCart } from "@/components/AddToCart";

export default async function ProductDetailPage({ params }: { params: Promise<{ subdomain: string; slug: string }> }) {
  const { subdomain, slug } = await params;
  let product;
  let store;
  try {
    [product, store] = await Promise.all([storefrontApi.getProduct(subdomain, slug), storefrontApi.getStore(subdomain)]);
  } catch { notFound(); }
  const accent = storeAccent(store.store);

  return (
    <div className="min-h-screen flex-1 bg-slate-50 pb-24">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4"><Link href={`/tienda/${subdomain}`} className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-700">←</Link><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{store.store.name}</p><h1 className="font-black text-slate-950">Detalle del producto</h1></div></div></header>
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" priority /> : <div className="flex h-full items-center justify-center text-7xl text-slate-300">□</div>}{product.isFeatured && <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">Destacado</span>}</div>
        <section className="self-center rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">{product.category && <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>{product.category.name}</p>}<h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{product.name}</h2><p className="mt-3 text-3xl font-black" style={{ color: accent }}>{formatPrice(product.price, store.store.currency)}</p><p className={`mt-2 text-sm font-bold ${product.inStock ? "text-emerald-700" : "text-red-700"}`}>{product.inStock ? `${product.available} disponibles` : "Producto agotado"}</p>{product.description ? <p className="mt-5 whitespace-pre-line text-sm font-medium leading-6 text-slate-700">{product.description}</p> : <p className="mt-5 text-sm font-medium text-slate-500">Sin descripción adicional.</p>}<div className="mt-7"><AddToCart product={product} accent={accent} /></div><p className="mt-4 text-center text-xs font-medium text-slate-500">El precio y el stock se validarán al confirmar el pedido.</p></section>
      </main>
    </div>
  );
}
