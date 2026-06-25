// En el navegador usamos "/api" (mismo origen): Next lo reenvía al backend
// mediante un rewrite. Así evitamos problemas de CORS en producción.
const API =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api"
    : "/api";
const KEY = "mt_super";

export function getSuperToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(KEY);
}
export function setSuperToken(token: string) {
  localStorage.setItem(KEY, token);
}
export function clearSuperToken() {
  localStorage.removeItem(KEY);
}

async function sfetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(getSuperToken()
        ? { Authorization: `Bearer ${getSuperToken()}` }
        : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearSuperToken();
      window.location.assign("/superadmin/login");
    }
    const message = (data as { message?: string | string[] }).message;
    throw new Error(Array.isArray(message) ? message[0] : (message ?? "Error"));
  }
  return data as T;
}

export interface GlobalStats {
  rangeDays: number;
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalOrders: number;
  grossVolume: string;
  mrr: string;
  newCompaniesThisMonth: number;
  newCompaniesInRange: number;
  cancelledCompaniesInRange: number;
  growthRate: number;
  churnRate: number;
  retentionRate: number;
  atRiskCompanies: number;
  alerts: {
    expiringSoon: number;
    pastDue: number;
    suspendedForDebt: number;
    atRisk: number;
  };
  companiesByMonth: { month: string; count: number }[];
  gmvByMonth: { month: string; total: number }[];
  planDistribution: { plan: string; count: number }[];
}
export interface Plan {
  id: number;
  name: string;
  slug: string;
  priceMonth: string;
  maxProducts: number | null;
  isActive: boolean;
}
export interface CompanyOwner {
  name: string;
  email: string;
}
export interface SaCompany {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "suspended" | "inactive";
  plan: { id: number; name: string; slug: string } | null;
  businessType: string | null;
  owner: CompanyOwner | null;
  orders: number;
  products: number;
  customers: number;
  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
  currentPeriodEndsAt: string | null;
  lastPaymentAt: string | null;
  createdAt: string;
}
export interface SaCompanyDetail {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "suspended" | "inactive";
  createdAt: string;
  plan: Plan | null;
  settings: {
    storeName: string;
    businessType: string | null;
    whatsappNumber: string | null;
    yapeHolderName: string | null;
    yapeNumber: string | null;
    allowsPickup: boolean;
    allowsDelivery: boolean;
    storeAddress: string | null;
  } | null;
  memberships: Array<{
    role: string;
    user: { id: string; name: string; email: string; isActive: boolean };
  }>;
  _count: { orders: number; products: number; customers: number };
  grossVolume: string;
  recentOrders: Array<{
    id: string;
    publicCode: string;
    customerName: string;
    status: string;
    paymentStatus: string;
    total: string;
    currency: string;
    createdAt: string;
  }>;
}
export interface AuditRow {
  id: string;
  action: string;
  companyId: string | null;
  companyName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  superAdmin: { name: string; email: string };
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit?: number;
}
export interface PlanInput {
  name: string;
  slug: string;
  priceMonth: number;
  maxProducts?: number | null;
  isActive?: boolean;
}

export interface CreateCompanyInput {
  responsibleName: string;
  email: string;
  password: string;
  commercialName: string;
  subdomain: string;
  whatsappNumber: string;
  businessType?: string;
  planId?: number;
}

export interface CreatedCompany {
  id: string;
  name: string;
  subdomain: string;
  owner: CompanyOwner;
  trialEndsAt: string;
}

export interface UpdateCompanyInput {
  name?: string;
  subdomain?: string;
  businessType?: string;
  whatsappNumber?: string;
  storeAddress?: string;
  allowsPickup?: boolean;
  allowsDelivery?: boolean;
}

export const superApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API}/superadmin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(
        (data as { message?: string }).message ?? "Credenciales incorrectas.",
      );
    setSuperToken(data.accessToken);
    return data;
  },
  stats: (days = 30) =>
    sfetch<GlobalStats>(`/superadmin/stats?days=${days}`),
  companies: (
    params: {
      search?: string;
      status?: string;
      planId?: number;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.planId) query.set("planId", String(params.planId));
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.toString();
    return sfetch<PageResult<SaCompany>>(
      `/superadmin/companies${suffix ? `?${suffix}` : ""}`,
    );
  },
  company: (id: string) =>
    sfetch<SaCompanyDetail>(`/superadmin/companies/${id}`),
  createCompany: (body: CreateCompanyInput) =>
    sfetch<CreatedCompany>("/superadmin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  updateCompany: (id: string, body: UpdateCompanyInput) =>
    sfetch<SaCompanyDetail>(`/superadmin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  plans: () => sfetch<Plan[]>("/superadmin/plans"),
  createPlan: (body: PlanInput) =>
    sfetch<Plan>("/superadmin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  updatePlan: (id: number, body: Partial<PlanInput>) =>
    sfetch<Plan>(`/superadmin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  suspend: (id: string) =>
    sfetch<{ ok: boolean; status: string }>(
      `/superadmin/companies/${id}/suspend`,
      { method: "POST" },
    ),
  activate: (id: string) =>
    sfetch<{ ok: boolean; status: string }>(
      `/superadmin/companies/${id}/activate`,
      { method: "POST" },
    ),
  assignPlan: (id: string, planId: number) =>
    sfetch(`/superadmin/companies/${id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    }),
  audits: (page = 1, action?: string) => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    if (action) q.set("action", action);
    return sfetch<PageResult<AuditRow>>(`/superadmin/audits?${q.toString()}`);
  },
  auditActions: () => sfetch<string[]>("/superadmin/audit-actions"),

  subscriptions: (status?: string, search?: string, page = 1) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (search) q.set("search", search);
    q.set("page", String(page));
    return sfetch<PageResult<SubscriptionRow>>(
      `/superadmin/subscriptions?${q.toString()}`,
    );
  },
  markPaid: (id: string, months = 1) =>
    sfetch(`/superadmin/companies/${id}/subscription/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months }),
    }),
  updateSubscription: (
    id: string,
    body: { status?: string; notes?: string; currentPeriodEndsAt?: string },
  ) =>
    sfetch(`/superadmin/companies/${id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  getSettings: () => sfetch<PlatformSettings>("/superadmin/settings"),
  updateSettings: (body: Partial<PlatformSettings>) =>
    sfetch<PlatformSettings>("/superadmin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  // ── Usuarios globales ──
  users: (search?: string, page = 1) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(page));
    return sfetch<PageResult<GlobalUser>>(`/superadmin/users?${q.toString()}`);
  },
  resetUserPassword: (id: string, newPassword: string) =>
    sfetch(`/superadmin/users/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    }),
  toggleUser: (id: string) =>
    sfetch<{ ok: boolean; isActive: boolean }>(`/superadmin/users/${id}/toggle`, {
      method: "POST",
    }),

  // ── Acciones sobre empresas ──
  deleteCompany: (id: string) =>
    sfetch(`/superadmin/companies/${id}/delete`, { method: "POST" }),
  resetOwnerPassword: (id: string, newPassword: string) =>
    sfetch(`/superadmin/companies/${id}/reset-owner-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    }),
  impersonate: (id: string) =>
    sfetch<{ accessToken: string }>(`/superadmin/companies/${id}/impersonate`, {
      method: "POST",
    }),
};

export interface GlobalUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
}

export interface SubscriptionRow {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
  currentPeriodEndsAt: string | null;
  plan: string | null;
  price: string;
  notes: string | null;
}
export interface PlatformSettings {
  platformName: string;
  logoUrl: string | null;
  mainDomain: string;
  currency: string;
  supportWhatsapp: string | null;
  supportEmail: string | null;
  terms: string | null;
  privacy: string | null;
  trialDays: number;
}
