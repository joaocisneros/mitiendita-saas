import type { MetadataRoute } from "next";
import { storefrontApi } from "@/lib/api";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://mitiendita-saas.vercel.app").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let stores: Awaited<ReturnType<typeof storefrontApi.seoIndex>> = [];
  try {
    stores = await storefrontApi.seoIndex();
  } catch {
    // Google podrá volver a solicitar el sitemap cuando el backend esté disponible.
  }
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    ...stores.flatMap((store) => {
      const base = `${SITE_URL}/tienda/${encodeURIComponent(store.subdomain)}`;
      return [
        { url: base, lastModified: new Date(store.updatedAt), changeFrequency: "daily" as const, priority: 0.8 },
        ...(store.products ?? []).map((product) => ({
          url: `${base}/producto/${encodeURIComponent(product.slug)}`,
          lastModified: new Date(product.updatedAt),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })),
      ];
    }),
  ];
}
