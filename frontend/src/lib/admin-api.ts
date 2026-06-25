// En el navegador usamos "/api" (mismo origen): Next lo reenvía al backend
// mediante un rewrite. Así evitamos problemas de CORS en producción.
const API =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api"
    : "/api";

const ACCESS_KEY = "mt_access";
const REFRESH_KEY = "mt_refresh";

export function getAccess(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function msg(body: unknown, fallback: string): string {
  const m = (body as { message?: string | string[] }).message;
  return Array.isArray(m) ? m[0] : (m ?? fallback);
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

/** fetch que convierte errores de red en un mensaje claro en español. */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    );
  }
}

/** fetch autenticado con reintento por refresh ante 401. */
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let res = await safeFetch(`${API}${path}`, withAuth(getAccess()));
  if (res.status === 401 && (await tryRefresh())) {
    res = await safeFetch(`${API}${path}`, withAuth(getAccess()));
  }
  if (res.status === 401 && typeof window !== "undefined") {
    clearTokens();
    if (!window.location.pathname.startsWith("/panel/login")) {
      window.location.assign("/panel/login?expired=1");
    }
  }
  return res;
}

async function jsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(msg(data, fallback));
  return data as T;
}

// ───────────────────── Tipos ─────────────────────
export interface DashboardData {
  salesToday: string;
  salesMonth: string;
  ordersToday: number;
  pendingOrders: number;
  newCustomersMonth: number;
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; available: number }[];
  topProducts: { id: string | null; name: string; units: number }[];
  recentOrders: AdminOrderRow[];
  salesTrend: { date: string; value: number }[];
  ordersByStatus: { status: string; count: number }[];
}
export interface AdminOrderRow {
  id: string;
  publicCode: string;
  status: string;
  paymentStatus: string;
  deliveryMethod?: string;
  customerName: string;
  total: string;
  currency: string;
  createdAt: string;
}
export interface AdminOrderDetail extends AdminOrderRow {
  customerPhone: string;
  address: string | null;
  reference: string | null;
  customerNote: string | null;
  subtotal: string;
  deliveryFee: string;
  items: { name: string; sku: string | null; unitPrice: string; quantity: number; lineTotal: string }[];
  payment: { status: string; expectedAmount: string; proofUrl: string | null; rejectionComment: string | null } | null;
  history: { fromStatus: string | null; toStatus: string; comment: string | null; createdAt: string }[];
}

// ───────────────────── API ─────────────────────
export const adminApi = {
  async register(body: RegisterInput) {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await jsonOrThrow<{
      accessToken: string;
      refreshToken: string;
      company: { id: string; name: string; subdomain: string };
      user: { id: string; name: string; email: string };
    }>(res, "No se pudo crear la cuenta.");
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await jsonOrThrow<{
      accessToken: string;
      refreshToken: string;
      user: { name: string; email: string };
    }>(res, "Credenciales incorrectas.");
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  me: () => authFetch("/auth/me").then((r) => jsonOrThrow(r, "No autorizado")),

  async logout() {
    const refreshToken = typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    clearTokens();
  },

  dashboard: () =>
    authFetch("/admin/dashboard").then((r) =>
      jsonOrThrow<DashboardData>(r, "Error al cargar el dashboard."),
    ),

  orders: (params: { status?: string; search?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString();
    return authFetch(`/admin/orders${qs ? `?${qs}` : ""}`).then((r) =>
      jsonOrThrow<{ items: AdminOrderRow[]; total: number; pages: number; page: number }>(
        r,
        "Error al cargar pedidos.",
      ),
    );
  },

  order: (id: string) =>
    authFetch(`/admin/orders/${id}`).then((r) =>
      jsonOrThrow<AdminOrderDetail>(r, "Pedido no encontrado."),
    ),

  approvePayment: (id: string) =>
    authFetch(`/admin/orders/${id}/payment/approve`, { method: "POST" }).then(
      (r) => jsonOrThrow<AdminOrderDetail>(r, "No se pudo aprobar."),
    ),

  rejectPayment: (id: string, comment: string) =>
    authFetch(`/admin/orders/${id}/payment/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    }).then((r) => jsonOrThrow<AdminOrderDetail>(r, "No se pudo rechazar.")),

  changeStatus: (id: string, status: string, comment?: string) =>
    authFetch(`/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    }).then((r) => jsonOrThrow<AdminOrderDetail>(r, "No se pudo cambiar el estado.")),

  // ── Productos ──
  products: (params: { search?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString();
    return authFetch(`/products${qs ? `?${qs}` : ""}`).then((r) =>
      jsonOrThrow<{ items: AdminProduct[]; total: number; pages: number }>(r, "Error"),
    );
  },
  product: (id: string) =>
    authFetch(`/products/${id}`).then((r) => jsonOrThrow<AdminProduct>(r, "Error")),
  createProduct: (body: ProductInput) =>
    authFetch(`/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<AdminProduct>(r, "No se pudo crear.")),
  updateProduct: (id: string, body: Partial<ProductInput>) =>
    authFetch(`/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<AdminProduct>(r, "No se pudo actualizar.")),
  deleteProduct: (id: string) =>
    authFetch(`/products/${id}`, { method: "DELETE" }).then((r) =>
      jsonOrThrow(r, "No se pudo eliminar."),
    ),

  // ── Categorías ──
  categories: () =>
    authFetch(`/categories`).then((r) => jsonOrThrow<AdminCategory[]>(r, "Error")),
  createCategory: (name: string) =>
    authFetch(`/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => jsonOrThrow<AdminCategory>(r, "No se pudo crear.")),
  updateCategory: (id: string, body: Partial<AdminCategory>) =>
    authFetch(`/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<AdminCategory>(r, "No se pudo actualizar.")),
  deleteCategory: (id: string) =>
    authFetch(`/categories/${id}`, { method: "DELETE" }).then((r) =>
      jsonOrThrow(r, "No se pudo eliminar."),
    ),

  customers: (params: { search?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    const query = q.toString();
    return authFetch(`/customers${query ? `?${query}` : ""}`).then((r) =>
      jsonOrThrow<{ items: AdminCustomer[]; total: number; page: number; pages: number }>(r, "No se pudieron cargar los clientes."),
    );
  },
  customer: (id: string) =>
    authFetch(`/customers/${id}`).then((r) =>
      jsonOrThrow<AdminCustomerDetail>(r, "Cliente no encontrado."),
    ),

  // ── Configuración ──
  settings: () =>
    authFetch(`/admin/settings`).then((r) => jsonOrThrow<StoreSettings>(r, "Error")),
  updateSettings: (body: UpdateSettingsInput) =>
    authFetch(`/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<StoreSettings>(r, "No se pudo guardar.")),

  // ── Subida de imágenes ──
  async uploadImage(file: File, folder: "products" | "categories" | "general") {
    const form = new FormData();
    form.append("file", file);
    const res = await authFetch(`/media/upload?folder=${folder}`, {
      method: "POST",
      body: form,
    });
    return jsonOrThrow<{ url: string; publicId: string }>(res, "No se pudo subir la imagen.");
  },

  // ── Inventario ──
  inventoryProducts: () =>
    authFetch("/admin/inventory/products").then((r) =>
      jsonOrThrow<InventoryProduct[]>(r, "Error"),
    ),
  inventoryMovements: (productId?: string, page = 1) => {
    const q = new URLSearchParams();
    if (productId) q.set("productId", productId);
    q.set("page", String(page));
    return authFetch(`/admin/inventory/movements?${q.toString()}`).then((r) =>
      jsonOrThrow<{ items: StockMovementRow[]; total: number; pages: number }>(r, "Error"),
    );
  },
  adjustStock: (body: { productId: string; type: string; quantity: number; reason?: string }) =>
    authFetch("/admin/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<{ ok: boolean; stock: number }>(r, "No se pudo ajustar.")),

  // ── Citas (reservas de servicios) ──
  appointments: (status?: string) => {
    const qs = status && status !== "all" ? `?status=${status}` : "";
    return authFetch(`/admin/appointments${qs}`).then((r) =>
      jsonOrThrow<AdminAppointment[]>(r, "Error al cargar las citas."),
    );
  },
  updateAppointmentStatus: (id: string, status: string) =>
    authFetch(`/admin/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then((r) => jsonOrThrow<AdminAppointment>(r, "No se pudo actualizar la cita.")),

  // ── Suscripciones (planes digitales) ──
  subscriptions: (filter?: string) => {
    const qs = filter && filter !== "all" ? `?filter=${filter}` : "";
    return authFetch(`/admin/subscriptions${qs}`).then((r) =>
      jsonOrThrow<AdminSubscription[]>(r, "Error al cargar las suscripciones."),
    );
  },
  subscriptionsSummary: () =>
    authFetch(`/admin/subscriptions/summary`).then((r) =>
      jsonOrThrow<{ active: number; expiring: number; expired: number }>(r, "Error."),
    ),
  updateSubscription: (id: string, action: "activate" | "renew" | "cancel", months?: number) =>
    authFetch(`/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(months ? { months } : {}) }),
    }).then((r) => jsonOrThrow<AdminSubscription>(r, "No se pudo actualizar la suscripción.")),
  editSubscription: (id: string, startsAt: string, endsAt: string) =>
    authFetch(`/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", startsAt, endsAt }),
    }).then((r) => jsonOrThrow<AdminSubscription>(r, "No se pudo editar la suscripción.")),

  // ── Reportes ──
  reports: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return authFetch(`/admin/reports${qs ? `?${qs}` : ""}`).then((r) =>
      jsonOrThrow<ReportsData>(r, "Error"),
    );
  },
};

export interface AdminAppointment {
  id: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  preferredAt: string;
  note: string | null;
  status: string;
  createdAt: string;
}

export interface AdminSubscription {
  id: string;
  planName: string;
  customerName: string;
  customerPhone: string;
  status: string;
  state: "pending" | "active" | "expiring" | "expired" | "cancelled";
  daysLeft: number | null;
  startsAt: string | null;
  endsAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  reserved: number;
  available: number;
  isActive: boolean;
}
export interface StockMovementRow {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
}
export interface ReportsData {
  from: string;
  to: string;
  totalRevenue: string;
  totalOrders: number;
  salesByDay: { date: string; revenue: string; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { name: string; units: number; revenue: string }[];
  frequentCustomers: { name: string; phone: string; orders: number; total: string }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  stock: number;
  reserved: number;
  sku: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string | null;
}
export interface ProductInput {
  name: string;
  price: number;
  stock: number;
  description?: string;
  sku?: string;
  categoryId?: string | null;
  imageUrl?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
}
export interface RegisterInput {
  responsibleName: string;
  email: string;
  password: string;
  commercialName: string;
  subdomain: string;
  whatsappNumber: string;
  businessType?: string;
}
export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  ordersCount: number;
  totalSpent: string;
}
export interface AdminCustomerDetail extends Omit<AdminCustomer, "ordersCount" | "totalSpent"> {
  orders: AdminOrderRow[];
}
export interface StoreSettings {
  storeName: string;
  businessType: string | null;
  description: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  whatsappNumber: string | null;
  yapeQrUrl: string | null;
  yapeHolderName: string | null;
  yapeNumber: string | null;
  whatsappMessage: string | null;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryFee: string;
  minOrder: string | null;
  storeAddress: string | null;
  deliveryNotes: string | null;
  subdomain?: string;
  status?: string;
}

export type UpdateSettingsInput = Omit<
  Partial<StoreSettings>,
  "deliveryFee" | "minOrder" | "subdomain" | "status"
> & {
  deliveryFee?: number;
  minOrder?: number;
};
