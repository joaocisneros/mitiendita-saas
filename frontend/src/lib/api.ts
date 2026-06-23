import type {
  ProductListResponse,
  PublicProduct,
  StoreResponse,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api";

async function get<T>(path: string, revalidate = 10): Promise<T> {
  const res = await fetch(`${API}${path}`, { next: { revalidate } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/** Extrae un mensaje de error legible de una respuesta del backend. */
function errorMessage(body: unknown, fallback: string): string {
  const m = (body as { message?: string | string[] }).message;
  if (Array.isArray(m)) return m[0];
  return m ?? fallback;
}

export interface CheckoutItem {
  productId: string;
  quantity: number;
}
export interface CheckoutBody {
  customerName: string;
  customerPhone: string;
  deliveryMethod: "pickup" | "delivery";
  address?: string;
  reference?: string;
  customerNote?: string;
  items: CheckoutItem[];
}

export interface OrderItemView {
  name: string;
  sku: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}
export interface OrderView {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  proofUrl: string | null;
  deliveryMethod: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  reference: string | null;
  customerNote: string | null;
  currency: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  reservationExpiresAt: string | null;
  createdAt: string;
  items: OrderItemView[];
}

export const storefrontApi = {
  getStore: (subdomain: string) =>
    get<StoreResponse>(`/public/stores/${subdomain}`),

  getProducts: (
    subdomain: string,
    params: { category?: string; search?: string; page?: number; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return get<ProductListResponse>(
      `/public/stores/${subdomain}/products${qs ? `?${qs}` : ""}`,
    );
  },

  getProduct: (subdomain: string, slug: string) =>
    get<PublicProduct>(`/public/stores/${subdomain}/products/${slug}`),

  async checkout(
    subdomain: string,
    body: CheckoutBody,
    idempotencyKey: string,
  ): Promise<OrderView> {
    const res = await fetch(`${API}/public/stores/${subdomain}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "No se pudo crear el pedido."));
    return data as OrderView;
  },

  async getOrder(subdomain: string, code: string): Promise<OrderView> {
    const res = await fetch(
      `${API}/public/stores/${subdomain}/orders/${code}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "Pedido no encontrado."));
    return data as OrderView;
  },

  async submitProof(
    subdomain: string,
    code: string,
    file: File,
  ): Promise<OrderView> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${API}/public/stores/${subdomain}/orders/${code}/proof`,
      { method: "POST", body: form },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(errorMessage(data, "No se pudo subir el comprobante."));
    return data as OrderView;
  },
};
