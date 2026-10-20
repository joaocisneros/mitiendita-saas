"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminApi, getAccess } from "@/lib/admin-api";
import { archetypeOf, resolveCategory, usesCredits } from "@/lib/business-categories";
import { DashboardIcon } from "@/components/DashboardIcon";
import { ProfileModal } from "@/components/ProfileModal";
import { AccountMenu } from "@/components/AccountMenu";
import { PlanNoticeModal } from "@/components/PlanNoticeModal";

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
  { href: "/panel/creditos", label: "Créditos", icon: "plans" as const },
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
  const [storeName, setStoreName] = useState("");
  const [usesAppointments, setUsesAppointments] = useState(false);
  const [usesSubscriptions, setUsesSubscriptions] = useState(false);
  const [usesCredit, setUsesCredit] = useState(false);
  const [supportMode, setSupportMode] = useState(false);
  const [email, setEmail] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  // Celular: la barra de abajo muestra 4 accesos y "Más" abre el resto del menú.
  const [moreOpen, setMoreOpen] = useState(false);

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
    if (item.href === "/panel/creditos") return usesCredit;
    return true;
  });
  const mobileHrefs = usesAppointments
    ? ["/panel", "/panel/citas", "/panel/productos", "/panel/clientes", "/panel/reportes"]
    : usesSubscriptions
      ? ["/panel", "/panel/suscripciones", "/panel/productos", "/panel/clientes", "/panel/reportes"]
      : ["/panel", "/panel/pedidos", "/panel/productos", "/panel/inventario", "/panel/reportes"];
  const mainMobile = nav.filter((item) => mobileHrefs.slice(0, 4).includes(item.href));
  const moreItems = nav.filter((item) => !mainMobile.includes(item));
  const moreActive = moreItems.some((item) => isActive(item.href, pathname));
  const current = nav.find((item) => isActive(item.href, pathname));
  const storeUrl = subdomain ? `/tienda/${subdomain}` : null;

  useEffect(() => {
    if (!getAccess()) router.replace("/panel/login");
    else queueMicrotask(() => setReady(true));
    queueMicrotask(() =>
      setSupportMode(localStorage.getItem("mt_impersonating") === "1"),
    );
  }, [router]);

  function exitSupport() {
    // Sale del modo soporte: limpia el token del dueño y vuelve al superadmin.
    localStorage.removeItem("mt_access");
    localStorage.removeItem("mt_impersonating");
    window.location.assign("/superadmin");
  }

  useEffect(() => {
    if (!getAccess()) return;
    adminApi
      .settings()
      .then((settings) => {
        setSubdomain(settings.subdomain ?? null);
        setStoreName(settings.storeName ?? "");
        const archetype = archetypeOf(resolveCategory(settings.businessType));
        setUsesAppointments(archetype === "servicios");
        setUsesSubscriptions(archetype === "digital");
        setUsesCredit(usesCredits(settings.businessType));
      })
      .catch(() => {});
    adminApi.me().then((u) => setEmail(u.email)).catch(() => {});
  }, []);

  async function logout() {
    localStorage.removeItem("mt_impersonating");
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
      <aside className="hidden h-dvh w-56 shrink-0 flex-col overflow-y-auto bg-slate-950 px-3 py-4 text-white shadow-xl md:flex">
        <Link href="/panel" className="mb-6 flex items-center gap-2.5 px-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="MiTiendita" className="h-9 w-9 shrink-0 rounded-lg shadow-lg shadow-black/30" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-tight">MiTiendita</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300">
              Panel del negocio
            </span>
          </span>
        </Link>

        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Gestión</p>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition ${
                  active ? "bg-violet-600 text-white shadow-md shadow-violet-950/30" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <DashboardIcon name={item.icon} className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 pt-3">
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2 text-[13px] font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:text-white"
            >
              <DashboardIcon name="store" className="h-4 w-4" />
              Ver mi tienda ↗
            </a>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-300 transition hover:bg-red-500/15 hover:text-red-300"
          >
            <DashboardIcon name="logout" className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {supportMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 md:px-6">
            <span>🛟 Estás en modo soporte (viendo esta tienda como superadmin).</span>
            <button
              onClick={exitSupport}
              className="rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 hover:bg-black"
            >
              ← Volver al superadmin
            </button>
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2.5 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-black">MiTiendita</span>
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
            <AccountMenu
              email={email}
              onEditProfile={() => setProfileOpen(true)}
              onLogout={logout}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 text-slate-950 md:p-6 md:pb-6">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-1 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
          {mainMobile.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-bold ${
                  active && !moreOpen ? "text-violet-700" : "text-slate-600"
                }`}
              >
                <DashboardIcon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-bold ${moreOpen || moreActive ? "text-violet-700" : "text-slate-600"}`}
          >
            <DashboardIcon name="menu" className="h-5 w-5" />
            Más
          </button>
        </nav>

        {/* "Más" en celular: el resto del menú en una hoja que sube desde abajo. */}
        {moreOpen && (
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 bg-slate-950/50" />
            <div
              className="absolute inset-x-0 bottom-[64px] rounded-t-3xl bg-white p-4 pb-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
              <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Más opciones</p>
              <div className="grid grid-cols-3 gap-2">
                {moreItems.map((item) => {
                  const active = isActive(item.href, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center text-xs font-bold ring-1 ${
                        active ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-slate-50 text-slate-700 ring-slate-200"
                      }`}
                    >
                      <DashboardIcon name={item.icon} className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                {storeUrl && (
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white"
                  >
                    <DashboardIcon name="store" className="h-4 w-4" />
                    Ver mi tienda ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className={`flex items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-700 ${storeUrl ? "" : "col-span-2"}`}
                >
                  <DashboardIcon name="logout" className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* En modo soporte (superadmin dentro de la tienda) no se muestra. */}
      {storeName && !supportMode && <PlanNoticeModal storeName={storeName} />}

      {profileOpen && (
        <ProfileModal
          email={email}
          onClose={() => setProfileOpen(false)}
          onSave={async (draft) => {
            await adminApi.updateProfile(draft);
          }}
        />
      )}
    </div>
  );
}
