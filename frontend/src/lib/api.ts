import type {
  ProductListResponse,
  PublicProduct,
  StoreResponse,
} from "./types";

// En el servidor (SSR) llamamos directo al backend.
// En el navegador usamos "/api" (mismo origen): Next lo reenvía al backend
// mediante un rewrite. Así el celular por https no tiene "contenido mixto".
const API =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api"
    : "/api";

/** fetch que convierte errores de red en un mensaje claro en español. */
function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init).catch(() => {
    throw new Error("No se pudo conectar. Revisa tu internet e inténtalo de nuevo.");
  });
}

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
  whatsappNotification?: {
    status: "sent" | "disabled" | "skipped" | "failed";
    messageId?: string;
    reason?: string;
  };
}

export interface AppointmentBody {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  productId?: string;
  preferredAt: string; // ISO
  note?: string;
  paymentMode?: "none" | "advance";
  advanceAmount?: number;
}
export interface AppointmentView {
  id: string;
  status: string;
  serviceName: string;
  preferredAt: string;
  paymentMode?: string | null;
  advanceAmount?: string | null;
  paymentStatus?: string;
  proofUrl?: string | null;
  proofSubmittedAt?: string | null;
}
export interface SubscriptionBody {
  customerName: string;
  customerPhone: string;
  planName: string;
  productId?: string;
  note?: string;
}
export interface SubscriptionView {
  id: string;
  publicCode?: string | null;
  status: string;
  planName: string;
  proofUrl?: string | null;
  proofSubmittedAt?: string | null;
  whatsappNotification?: {
    status: "sent" | "disabled" | "skipped" | "failed";
    messageId?: string;
    reason?: string;
  };
}

export interface PublicPlan {
  id: number;
  name: string;
  slug: string;
  priceMonth: string;
  maxProducts: number | null;
}

/** Planes activos para la landing. Devuelve [] si el backend no responde. */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  try {
    return await get<PublicPlan[]>("/public/plans", 60);
  } catch {
    return [];
  }
}

export const storefrontApi = {
  getStore: (subdomain: string) =>
    get<StoreResponse>(`/public/stores/${subdomain}`),

  getProducts: (
    subdomain: string,
    params: { category?: string; search?: string; page?: number; limit?: number; sort?: string } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.sort) q.set("sort", params.sort);
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
    const res = await safeFetch(`${API}/public/stores/${subdomain}/checkout`, {
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

  async createAppointment(
    subdomain: string,
    body: AppointmentBody,
  ): Promise<AppointmentView> {
    const res = await safeFetch(`${API}/public/stores/${subdomain}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "No se pudo crear la reserva."));
    return data as AppointmentView;
  },

  async submitAppointmentProof(
    subdomain: string,
    appointmentId: string,
    file: File,
  ): Promise<AppointmentView> {
    const form = new FormData();
    form.append("file", file);
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/appointments/${appointmentId}/proof`,
      { method: "POST", body: form },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(errorMessage(data, "No se pudo subir el comprobante."));
    return data as AppointmentView;
  },

  async createSubscription(
    subdomain: string,
    body: SubscriptionBody,
  ): Promise<SubscriptionView> {
    const res = await safeFetch(`${API}/public/stores/${subdomain}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "No se pudo crear la suscripción."));
    return data as SubscriptionView;
  },

  async submitSubscriptionProof(
    subdomain: string,
    subscriptionId: string,
    file: File,
  ): Promise<SubscriptionView> {
    const form = new FormData();
    form.append("file", file);
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/subscriptions/${subscriptionId}/proof`,
      { method: "POST", body: form },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(errorMessage(data, "No se pudo subir el comprobante."));
    return data as SubscriptionView;
  },

  async getOrder(subdomain: string, code: string): Promise<OrderView> {
    const res = await safeFetch(
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
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/orders/${code}/proof`,
      { method: "POST", body: form },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(errorMessage(data, "No se pudo subir el comprobante."));
    return data as OrderView;
  },
};
