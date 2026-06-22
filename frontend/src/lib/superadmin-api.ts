const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8300/api";
const KEY = "mt_super";

export function getSuperToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(KEY);
}
export function setSuperToken(t: string) {
  localStorage.setItem(KEY, t);
}
export function clearSuperToken() {
  localStorage.removeItem(KEY);
}

async function sfetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(getSuperToken() ? { Authorization: `Bearer ${getSuperToken()}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = (data as { message?: string }).message;
    throw new Error(m ?? "Error");
  }
  return data;
}

export interface GlobalStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalOrders: number;
  grossVolume: string;
}
export interface SaCompany {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  plan: string | null;
  orders: number;
  createdAt: string;
}
export interface Plan {
  id: number;
  name: string;
  slug: string;
  priceMonth: string;
}

export const superApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API}/superadmin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string }).message ?? "Credenciales incorrectas.");
    setSuperToken(data.accessToken);
    return data;
  },
  stats: () => sfetch("/superadmin/stats") as Promise<GlobalStats>,
  companies: (search?: string) =>
    sfetch(`/superadmin/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`) as Promise<SaCompany[]>,
  plans: () => sfetch("/superadmin/plans") as Promise<Plan[]>,
  suspend: (id: string) => sfetch(`/superadmin/companies/${id}/suspend`, { method: "POST" }),
  activate: (id: string) => sfetch(`/superadmin/companies/${id}/activate`, { method: "POST" }),
  assignPlan: (id: string, planId: number) =>
    sfetch(`/superadmin/companies/${id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    }),
};
