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
    // Datos del panel siempre frescos (sin caché ni respuestas 304).
    return await fetch(url, { cache: "no-store", ...init });
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
  credits?: CreditSummary;
}
export interface AdminOrderRow {
  id: string;
  publicCode: string;
  status: string;
  paymentStatus: string;
  deliveryMethod?: string;
  customerName: string;
  customerPhone: string;
  total: string;
  currency: string;
  createdAt: string;
  detectedMethod: string | null;
  operationNumber: string | null;
}
export interface AdminOrderDetail extends AdminOrderRow {
  businessType: string | null;
  customerPhone: string;
  address: string | null;
  reference: string | null;
  customerNote: string | null;
  subtotal: string;
  deliveryFee: string;
  items: { name: string; variant?: string | null; sku: string | null; unitPrice: string; quantity: number; lineTotal: string }[];
  payment: {
    status: string;
    expectedAmount: string;
    proofUrl: string | null;
    rejectionComment: string | null;
    operationNumber: string | null;
    detectedMethod: string | null;
  } | null;
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
    // Inicio de sesión real del dueño: ya no es el modo soporte del superadmin.
    localStorage.removeItem("mt_impersonating");
    return data;
  },

  me: () =>
    authFetch("/auth/me").then((r) =>
      jsonOrThrow<{ userId: string; email: string; companyId: string; role: string }>(r, "No autorizado"),
    ),

  updateProfile: (body: { name?: string; currentPassword?: string; newPassword?: string }) =>
    authFetch("/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<{ id: string; name: string; email: string }>(r, "No se pudo actualizar el perfil.")),


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

  orders: (params: { status?: string; paymentStatus?: string; search?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.paymentStatus) q.set("paymentStatus", params.paymentStatus);
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
  planStatus: () =>
    authFetch(`/admin/settings/plan`).then((r) =>
      jsonOrThrow<{
        subscriptionStatus: "trial" | "active" | "past_due" | "cancelled" | null;
        currentPeriodEndsAt: string | null;
        planName: string | null;
        supportWhatsapp: string | null;
      }>(r, "Error"),
    ),
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
  inventoryReservations: () =>
    authFetch("/admin/inventory/reservations").then((r) =>
      jsonOrThrow<UnpaidReservation[]>(r, "No se pudieron cargar las reservas."),
    ),
  inventoryMovements: (productId?: string, page = 1, opts: { limit?: number; channel?: string } = {}) => {
    const q = new URLSearchParams();
    if (productId) q.set("productId", productId);
    q.set("page", String(page));
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.channel) q.set("channel", opts.channel);
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
  adjustVariants: (body: {
    productId: string;
    type: "entry" | "adjustment";
    reason?: string;
    rows: Array<{ size?: string; color?: string; quantity: number }>;
  }) =>
    authFetch("/admin/inventory/adjust-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<{ ok: boolean; stock: number; added: number }>(r, "No se pudo guardar.")),

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
  approveAppointmentPayment: (id: string) =>
    authFetch(`/admin/appointments/${id}/payment/approve`, { method: "POST" }).then((r) =>
      jsonOrThrow<AdminAppointment>(r, "No se pudo aprobar el adelanto."),
    ),
  rejectAppointmentPayment: (id: string, comment: string) =>
    authFetch(`/admin/appointments/${id}/payment/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    }).then((r) => jsonOrThrow<AdminAppointment>(r, "No se pudo rechazar el adelanto.")),

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
  updateSubscription: (id: string, action: "activate" | "renew" | "cancel", months?: number, price?: number) =>
    authFetch(`/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(months ? { months } : {}), ...(price != null ? { price } : {}) }),
    }).then((r) => jsonOrThrow<AdminSubscription>(r, "No se pudo actualizar la suscripción.")),
  editSubscription: (id: string, startsAt: string, endsAt: string) =>
    authFetch(`/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", startsAt, endsAt }),
    }).then((r) => jsonOrThrow<AdminSubscription>(r, "No se pudo editar la suscripción.")),
  approveSubscriptionRenewal: (id: string) =>
    authFetch(`/admin/subscriptions/${id}/renewal/approve`, { method: "POST" }).then((r) =>
      jsonOrThrow<AdminSubscription>(r, "No se pudo aprobar la renovación."),
    ),
  rejectSubscriptionRenewal: (id: string) =>
    authFetch(`/admin/subscriptions/${id}/renewal/reject`, { method: "POST" }).then((r) =>
      jsonOrThrow<AdminSubscription>(r, "No se pudo rechazar la renovación."),
    ),

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

  // ── Ventas al crédito (módulo opcional) ──
  creditSummary: () =>
    authFetch("/admin/credits/summary").then((r) =>
      jsonOrThrow<CreditSummary>(r, "No se pudo cargar el resumen de créditos."),
    ),
  creditCustomers: (params: { search?: string; status?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status && params.status !== "all") q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString();
    return authFetch(`/admin/credits/customers${qs ? `?${qs}` : ""}`).then((r) =>
      jsonOrThrow<{ items: CreditCustomer[]; total: number; pages: number }>(r, "No se pudieron cargar las clientas."),
    );
  },
  creditDniLookup: (dni: string) =>
    authFetch(`/admin/credits/dni/${dni}`).then((r) =>
      jsonOrThrow<CreditDniLookup>(r, "No se pudo consultar el DNI."),
    ),
  creditCustomer: (id: string) =>
    authFetch(`/admin/credits/customers/${id}`).then((r) =>
      jsonOrThrow<CreditCustomerDetail>(r, "No se pudo cargar la clienta."),
    ),
  createCreditCustomer: (body: CreditCustomerInput) =>
    authFetch("/admin/credits/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<CreditCustomer>(r, "No se pudo registrar a la clienta.")),
  updateCreditCustomer: (id: string, body: Partial<CreditCustomerInput> & { isActive?: boolean }) =>
    authFetch(`/admin/credits/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<CreditCustomer>(r, "No se pudo guardar.")),
  createCreditSale: (customerId: string, body: CreditSaleInput) =>
    authFetch(`/admin/credits/customers/${customerId}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<CreditSale>(r, "No se pudo registrar la venta.")),
  cancelCreditSale: (saleId: string, reason?: string) =>
    authFetch(`/admin/credits/sales/${saleId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).then((r) => jsonOrThrow<CreditSale>(r, "No se pudo anular la venta.")),
  createCreditPayment: (customerId: string, body: CreditPaymentInput) =>
    authFetch(`/admin/credits/customers/${customerId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<{ balance: string }>(r, "No se pudo registrar el abono.")),
  updateCreditPayment: (paymentId: string, body: Omit<CreditPaymentInput, "creditSaleId">) =>
    authFetch(`/admin/credits/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => jsonOrThrow<{ balance: string }>(r, "No se pudo corregir el abono.")),
  deleteCreditCustomer: (id: string) =>
    authFetch(`/admin/credits/customers/${id}`, { method: "DELETE" }).then((r) =>
      jsonOrThrow<{ ok: boolean }>(r, "No se pudo eliminar a la clienta."),
    ),
  deleteCreditPayment: (paymentId: string) =>
    authFetch(`/admin/credits/payments/${paymentId}`, { method: "DELETE" }).then((r) =>
      jsonOrThrow<{ ok: boolean }>(r, "No se pudo eliminar el abono."),
    ),
};

export interface AdminAppointment {
  id: string;
  publicCode: string | null;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  preferredAt: string;
  note: string | null;
  status: string;
  paymentMode: string | null;
  advanceAmount: string | null;
  paymentStatus: string;
  proofUrl: string | null;
  proofSubmittedAt: string | null;
  rejectionComment: string | null;
  operationNumber: string | null;
  detectedMethod: string | null;
  createdAt: string;
}

export interface AdminSubscription {
  id: string;
  publicCode?: string | null;
  planName: string;
  customerName: string;
  customerPhone: string;
  status: string;
  state: "pending" | "active" | "expiring" | "expired" | "cancelled";
  daysLeft: number | null;
  startsAt: string | null;
  endsAt: string | null;
  note: string | null;
  proofUrl: string | null;
  proofSubmittedAt: string | null;
  operationNumber: string | null;
  detectedMethod: string | null;
  price: string | null;
  renewalMonths: number | null;
  renewalProofUrl: string | null;
  renewalSubmittedAt: string | null;
  renewalOperationNumber: string | null;
  renewalDetectedMethod: string | null;
  createdAt: string;
}

/** Pedido sin pagar que aparta stock hasta `expiresAt`. */
export interface UnpaidReservation {
  id: string;
  code: string;
  customerName: string;
  total: string;
  createdAt: string;
  expiresAt: string | null;
  items: { productId: string | null; name: string; variant: string | null; quantity: number }[];
}

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  reserved: number;
  available: number;
  /** Unidades separadas por pedidos pagados que falta confirmar. */
  toConfirm?: number;
  /** Total que la dueña registró (lo que queda + lo vendido). */
  registered?: number;
  soldOnline?: number;
  soldCredit?: number;
  isActive: boolean;
  productType?: string | null;
  /** Cuánto queda por talla/color (vacío si no tiene opciones). */
  variants?: InventoryVariant[];
}
export interface InventoryVariant {
  size: string | null;
  color: string | null;
  stock: number;
  reserved: number;
}
export interface StockMovementRow {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  /** tienda = pedido online · credito = venta al crédito · ajuste = cambio a mano. */
  channel?: "tienda" | "credito" | "ajuste";
  code?: string | null;
  customerName?: string | null;
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
  credits?: CreditsReport;
}

/** Ventas al crédito dentro del periodo del reporte. */
export interface CreditsReport {
  soldTotal: string;
  salesCount: number;
  /** Rebajas dadas frente al precio normal (solo ventas que guardan ese precio). */
  discounts?: { total: string; sales: number };
  collected: string;
  paymentsCount: number;
  receivable: string;
  customersWithDebt: number;
  customers: number;
  byDay: { date: string; sold: string; collected: string }[];
  topDebtors: { name: string; phone: string; balance: string }[];
  topPayers: { name: string; phone: string; payments: number; paid: string }[];
  /** Las que más compraron al crédito en el periodo (para premiar). */
  topBuyers: { name: string; phone: string; bought: string; units: number; balance: string }[];
  topProducts: { name: string; units: number; total: string }[];
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
  images: string[] | null;
  brand: string | null;
  material: string | null;
  sizeGuide: string | null;
  productType?: string | null;
  sizes: string | null;
  colors: string | null;
  variantStocks: ProductVariantStock[] | null;
  reservationPaymentMode?: "none" | "optional" | "required";
  reservationAdvanceType?: "fixed" | "percent";
  reservationAdvanceValue?: string;
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
  images?: string[];
  brand?: string;
  material?: string;
  sizeGuide?: string;
  productType?: string;
  sizes?: string;
  colors?: string;
  variantStocks?: Array<{ size?: string; color?: string; stock: number }>;
  reservationPaymentMode?: "none" | "optional" | "required";
  reservationAdvanceType?: "fixed" | "percent";
  reservationAdvanceValue?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}
export interface ProductVariantStock {
  size: string | null;
  color: string | null;
  stock: number;
  reserved: number;
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
  plinQrUrl: string | null;
  plinHolderName: string | null;
  plinNumber: string | null;
  hours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  searchVisible: boolean;
  creditRequests: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  socialImageUrl: string | null;
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

// ── Ventas al crédito ──
export type CreditPaymentMethod = "cash" | "yape" | "plin" | "transfer";

export interface CreditSummary {
  receivable: string;
  collectedThisMonth: string;
  customersWithDebt: number;
  customers: number;
}

export interface CreditCustomer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  documentNumber: string | null;
  address: string;
  reference: string | null;
  note: string | null;
  creditLimit: string | null;
  birthday: string | null;
  isActive: boolean;
  lastActivityAt: string | null;
  createdAt: string;
  totalSold?: string;
  totalPaid?: string;
  balance?: string;
  lastPaymentAt?: string | null;
}

export interface CreditSale {
  id: string;
  code: string;
  status: "pending" | "paid" | "cancelled";
  total: string;
  paidAmount: string;
  pending: string;
  note: string | null;
  soldAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** listPrice: precio normal del producto al venderlo (null en ventas antiguas). */
  items: { productId: string | null; name: string; variant: string | null; unitPrice: string; listPrice?: string | null; quantity: number; lineTotal: string; imageUrl: string | null }[];
}

export interface CreditPayment {
  id: string;
  amount: string;
  method: CreditPaymentMethod;
  paidAt: string;
  note: string | null;
  createdAt: string;
  creditSaleId: string | null;
  saleCode: string | null;
  canDelete: boolean;
}

export interface CreditCustomerDetail extends CreditCustomer {
  totalSold: string;
  totalPaid: string;
  balance: string;
  sales: CreditSale[];
  payments: CreditPayment[];
}

export interface CreditDniLookup {
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  existingCustomerId: string | null;
}

export interface CreditCustomerInput {
  documentNumber?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  reference?: string;
  note?: string;
  creditLimit?: number | null;
  birthday?: string | null;
}

export interface CreditSaleInput {
  items: { productId: string; quantity: number; size?: string; color?: string; unitPrice?: number }[];
  note?: string;
  soldAt?: string;
}

export interface CreditPaymentInput {
  amount: number;
  creditSaleId?: string;
  method?: CreditPaymentMethod;
  paidAt?: string;
  note?: string;
}
