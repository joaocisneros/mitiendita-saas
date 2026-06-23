import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Imágenes de productos servidas desde Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "http", hostname: "localhost", port: "8300", pathname: "/api/media/local/**" },
    ],
  },
};

export default nextConfig;
