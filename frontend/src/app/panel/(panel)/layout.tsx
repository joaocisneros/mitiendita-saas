"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminApi, getAccess } from "@/lib/admin-api";
import { archetypeOf, resolveCategory } from "@/lib/business-categories";
import { DashboardIcon } from "@/components/DashboardIcon";

const NAV = [
  { href: "/panel", label: "Resumen", icon: "dashboard" as const },
  { href: "/panel/pedidos", label: "Pedidos", icon: "orders" as const },
  { href: "/panel/citas", label: "Citas", icon: "calendar" as const },
  { href: "/panel/suscripciones", label: "Suscripciones", icon: "plans" as const },
  { href: "/panel/productos", label: "Productos", icon: "products" as const },
  { href: "/panel/categorias", label: "Categorías", icon: "categories" as const },
  { href: "/panel/inventario", label: "Inventario", icon: "inventory" as const },
  { href: "/panel/clientes", label: "Clientes", icon: "customers" as const },
  { href: "/panel/reportes", label: "Reportes", icon: "reports" as const },
  { href: "/panel/config", label: "Configuración", icon: "settings" as const },
];

function isActive(href: string, pathname: string) {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [usesAppointments, setUsesAppointments] = useState(false);
  const [usesSubscriptions, setUsesSubscriptions] = useState(false);

  const baseNav = NAV.map((item) =>
    item.href === "/panel/citas"
      ? { ...item, label: "Citas / Reservas" }
      : item.href === "/panel/suscripciones"
        ? { ...item, label: "Solicitudes de planes" }
        : item,
  );
  const nav = baseNav.filter((item) => {
    if (item.href === "/panel/pedidos") return !usesAppointments && !usesSubscriptions;
    if (item.href === "/panel/citas") return usesAppointments;
    if (item.href === "/panel/suscripciones") return usesSubscriptions;
    if (item.href === "/panel/inventario") return !usesAppointments && !usesSubscriptions;
    return true;
  });
  const mobileHrefs = usesAppointments
    ? ["/panel", "/panel/citas", "/panel/productos", "/panel/clientes", "/panel/reportes"]
    : usesSubscriptions
      ? ["/panel", "/panel/suscripciones", "/panel/productos", "/panel/clientes", "/panel/reportes"]
      : ["/panel", "/panel/pedidos", "/panel/productos", "/panel/inventario", "/panel/reportes"];
  const current = nav.find((item) => isActive(item.href, pathname));
  const storeUrl = subdomain ? `/tienda/${subdomain}` : null;

  useEffect(() => {
    if (!getAccess()) router.replace("/panel/login");
    else queueMicrotask(() => setReady(true));
  }, [router]);

  useEffect(() => {
    if (!getAccess()) return;
    adminApi
      .settings()
      .then((settings) => {
        setSubdomain(settings.subdomain ?? null);
        const archetype = archetypeOf(resolveCategory(settings.businessType));
        setUsesAppointments(archetype === "servicios");
        setUsesSubscriptions(archetype === "digital");
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await adminApi.logout();
    router.replace("/panel/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-semibold text-slate-700">
        Cargando panel...
      </div>
    );
  }

  return (
    <div className="admin-shell flex h-dvh min-h-0 overflow-hidden bg-slate-100 text-slate-950">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-slate-950 px-4 py-5 text-white shadow-xl md:flex">
        <Link href="/panel" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-950/40">
            <DashboardIcon name="store" />
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">MiTiendita</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Panel del negocio
            </span>
          </span>
        </Link>

        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Gestión</p>
        <nav className="flex-1 space-y-1.5">
          {nav.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-violet-600 text-white shadow-md shadow-violet-950/30" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <DashboardIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1.5 border-t border-white/10 pt-4">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:text-white"
            >
              <DashboardIcon name="store" />
              Ver mi tienda ↗
            </a>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-red-500/15 hover:text-red-300"
          >
            <DashboardIcon name="logout" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
              <DashboardIcon name="store" />
            </span>
            <span className="font-black">MiTiendita</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-900">{current?.label ?? "Panel administrativo"}</p>
            <p className="text-xs font-medium text-slate-600">Controla tu negocio desde un solo lugar</p>
          </div>
          <div className="flex items-center gap-2">
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700"
              >
                <DashboardIcon name="store" className="h-4 w-4" />
                <span className="hidden sm:inline">Ver mi tienda</span> ↗
              </a>
            )}
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 md:hidden"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 text-slate-950 md:p-7 md:pb-7">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
          {baseNav.filter((item) => mobileHrefs.includes(item.href)).map((item) => {
            const active = item.href === "/panel" ? pathname === "/panel" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-bold ${
                  active ? "text-violet-700" : "text-slate-600"
                }`}
              >
                <DashboardIcon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
