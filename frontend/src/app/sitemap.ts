import type { MetadataRoute } from "next";
import { storefrontApi } from "@/lib/api";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://mitiendita-saas.vercel.app").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let stores: Array<{ subdomain: string; updatedAt: string }> = [];
  try {
    stores = await storefrontApi.seoIndex();
  } catch {
    // Google podrá volver a solicitar el sitemap cuando el backend esté disponible.
  }
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...stores.map((store) => ({
      url: `${SITE_URL}/tienda/${encodeURIComponent(store.subdomain)}`,
      lastModified: new Date(store.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
