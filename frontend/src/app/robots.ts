import type { MetadataRoute } from "next";

/** SEO: permite indexar las tiendas públicas y oculta los paneles privados. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel", "/superadmin", "/api"],
    },
  };
}
