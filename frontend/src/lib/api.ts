import type {
  ProductListResponse,
  PublicProduct,
  StoreResponse,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    // El catálogo público puede cachearse unos segundos.
    next: { revalidate: 10 },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { message?: string }).message ?? res.statusText;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const storefrontApi = {
  getStore: (subdomain: string) =>
    get<StoreResponse>(`/public/stores/${subdomain}`),

  getProducts: (
    subdomain: string,
    params: { category?: string; search?: string; page?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString();
    return get<ProductListResponse>(
      `/public/stores/${subdomain}/products${qs ? `?${qs}` : ""}`,
    );
  },

  getProduct: (subdomain: string, slug: string) =>
    get<PublicProduct>(`/public/stores/${subdomain}/products/${slug}`),
};
