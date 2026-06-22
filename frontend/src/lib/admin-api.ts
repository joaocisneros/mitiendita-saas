const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api";

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

/** fetch autenticado con reintento por refresh ante 401. */
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let res = await fetch(`${API}${path}`, withAuth(getAccess()));
  if (res.status === 401 && (await tryRefresh())) {
    res = await fetch(`${API}${path}`, withAuth(getAccess()));
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
  ordersToday: number;
  pendingOrders: number;
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; available: number }[];
  recentOrders: AdminOrderRow[];
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
};
