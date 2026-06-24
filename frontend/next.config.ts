import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir cargar los recursos del cliente desde la red local (probar en el celular).
  allowedDevOrigins: ["192.168.100.45"],
  // El navegador llama a /api (mismo origen) y Next lo reenvía al backend.
  // Evita "contenido mixto" cuando el celular entra por https.
  // En producción, BACKEND_URL apunta al backend en AlwaysData
  // (ej: https://tu-cuenta.alwaysdata.net). En local usa localhost:8300.
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8300";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      // Link corto del comprobante: /c/MT-XXXX → backend redirige a la foto.
      { source: "/c/:code", destination: `${backend}/api/c/:code` },
    ];
  },
  images: {
    remotePatterns: [
      // Imágenes de productos servidas desde Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Fotos de stock para la tienda vitrina de ejemplo.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost", port: "8300", pathname: "/api/media/local/**" },
    ],
  },
};

export default nextConfig;
