import type {
  ProductListResponse,
  PublicProduct,
  StoreResponse,
} from "./types";

// En el servidor (SSR) llamamos directo al backend.
// En el navegador usamos "/api" (mismo origen): Next lo reenvía al backend
// mediante un rewrite. Así el celular por https no tiene "contenido mixto".
const serverApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.BACKEND_URL
    ? `${process.env.BACKEND_URL.replace(/\/$/, "")}/api`
    : "http://localhost:8300/api");

const API = typeof window === "undefined" ? serverApiUrl : "/api";

/** fetch que convierte errores de red en un mensaje claro en español. */
function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init).catch(() => {
    throw new Error("No se pudo conectar. Revisa tu internet e inténtalo de nuevo.");
  });
}

async function get<T>(path: string, revalidate = 0): Promise<T> {
  const res = await fetch(
    `${API}${path}`,
    revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" },
  );
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
  variant?: string;
  size?: string;
  color?: string;
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
  variant?: string | null;
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
  /** Si ya se envió comprobante (la foto no se muestra en la vista pública). */
  hasProof?: boolean;
  proofUrl: string | null;
  /** Firma del enlace /c/CODE?k=... (solo para quien subió el comprobante). */
  proofKey?: string | null;
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
  /** El pedido aún no aparta stock: productos por agotarse o que otra persona compra. */
  stockWarnings?: { name: string; available: number; othersBuying: number }[];
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
  publicCode?: string | null;
  status: string;
  serviceName: string;
  preferredAt: string;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string | null;
  advanceAmount?: string | null;
  paymentStatus?: string;
  proofUrl?: string | null;
  proofKey?: string | null;
  proofSubmittedAt?: string | null;
  rejectionComment?: string | null;
  createdAt?: string;
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
  state?: "pending" | "active" | "expiring" | "expired" | "cancelled";
  planName: string;
  customerName?: string;
  customerPhone?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  proofUrl?: string | null;
  proofKey?: string | null;
  proofSubmittedAt?: string | null;
  price?: string | null;
  renewalMonths?: number | null;
  renewalProofUrl?: string | null;
  renewalSubmittedAt?: string | null;
  createdAt?: string;
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

export interface PublicLegal {
  platformName: string;
  legalName: string | null;
  legalRuc: string | null;
  legalAddress: string | null;
  supportEmail: string | null;
  supportWhatsapp: string | null;
}

/** Titular de la plataforma y contacto de soporte. Devuelve null si el backend no responde. */
export async function getPublicLegal(): Promise<PublicLegal | null> {
  try {
    return await get<PublicLegal>("/public/legal", 300);
  } catch {
    return null;
  }
}

export const storefrontApi = {
  seoIndex: () =>
    get<Array<{ subdomain: string; updatedAt: string; products?: Array<{ slug: string; updatedAt: string }> }>>(
      "/public/stores/seo/index",
      300,
    ),
  getStore: (subdomain: string) =>
    get<StoreResponse>(`/public/stores/${subdomain}`),

  getProducts: (
    subdomain: string,
    params: { category?: string; search?: string; page?: number; limit?: number; sort?: string; availability?: "available" | "soldout" } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.availability) q.set("availability", params.availability);
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

  async submitSubscriptionRenewalProof(
    subdomain: string,
    subscriptionId: string,
    months: number,
    file: File,
  ): Promise<SubscriptionView> {
    const form = new FormData();
    form.append("months", String(months));
    form.append("file", file);
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/subscriptions/${subscriptionId}/renewal-proof`,
      { method: "POST", body: form },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(errorMessage(data, "No se pudo enviar la renovación."));
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

  /** El cliente cancela su pedido antes de pagar (el stock vuelve al instante). */
  async cancelOrder(subdomain: string, code: string): Promise<OrderView> {
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/orders/${code}/cancel`,
      { method: "POST" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "No se pudo cancelar el pedido."));
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

  async getAppointmentAvailability(
    subdomain: string,
    date: string,
  ): Promise<{ bookedTimes: string[] }> {
    return get<{ bookedTimes: string[] }>(
      `/public/stores/${subdomain}/appointments/availability?date=${date}`,
      0,
    );
  },

  async getAppointment(subdomain: string, id: string): Promise<AppointmentView> {
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/appointments/${id}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "Cita no encontrada."));
    return data as AppointmentView;
  },

  async getSubscription(subdomain: string, id: string): Promise<SubscriptionView> {
    const res = await safeFetch(
      `${API}/public/stores/${subdomain}/subscriptions/${id}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, "Suscripción no encontrada."));
    return data as SubscriptionView;
  },
};
