import type { MetadataRoute } from "next";

/** SEO: permite indexar las tiendas públicas y oculta los paneles privados. */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mitiendita-saas.vercel.app").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel", "/superadmin", "/api", "/registro", "/tienda/*/pedido", "/tienda/*/cita", "/tienda/*/suscripcion"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
