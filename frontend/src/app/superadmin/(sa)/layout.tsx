"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSuperToken, getSuperToken } from "@/lib/superadmin-api";
import { DashboardIcon } from "@/components/DashboardIcon";

const NAV = [
  { href: "/superadmin", label: "Panel general", icon: "dashboard" as const },
  {
    href: "/superadmin/empresas",
    label: "Empresas",
    icon: "companies" as const,
  },
  { href: "/superadmin/usuarios", label: "Usuarios", icon: "customers" as const },
  { href: "/superadmin/planes", label: "Planes", icon: "plans" as const },
  {
    href: "/superadmin/suscripciones",
    label: "Suscripciones",
    icon: "orders" as const,
  },
  {
    href: "/superadmin/actividad",
    label: "Actividad",
    icon: "activity" as const,
  },
  {
    href: "/superadmin/configuracion",
    label: "Configuración",
    icon: "settings" as const,
  },
];

function isActive(href: string, pathname: string) {
  return href === "/superadmin"
    ? pathname === "/superadmin"
    : pathname.startsWith(href);
}

export default function SaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const current = NAV.find((item) => isActive(item.href, pathname));

  useEffect(() => {
    if (!getSuperToken()) router.replace("/superadmin/login");
    else queueMicrotask(() => setReady(true));
  }, [router]);

  function logout() {
    clearSuperToken();
    router.replace("/superadmin/login");
  }

  if (!ready)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-semibold text-slate-200">
        Cargando plataforma...
      </div>
    );

  return (
    <div className="admin-shell flex h-dvh min-h-0 overflow-hidden bg-slate-100 text-slate-950">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-slate-950 px-4 py-5 text-white shadow-xl md:flex">
        <Link href="/superadmin" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-950/40">
            <DashboardIcon name="store" />
          </span>
          <span>
            <span className="block text-lg font-black">MiTiendita</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
              Administrador global
            </span>
          </span>
        </Link>
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Plataforma
        </p>
        <nav className="flex-1 space-y-1.5">
          {NAV.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-violet-600 text-white shadow-md shadow-violet-950/30" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              >
                <DashboardIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <p className="text-xs font-bold text-white">Administrador global</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            Acceso y control de todas las empresas.
          </p>
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-red-500/15 hover:text-red-300"
        >
          <DashboardIcon name="logout" />
          Cerrar sesión
        </button>
      </aside>

      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
          <div>
            <p className="font-black text-slate-950">
              {current?.label ?? "Administración de plataforma"}
            </p>
            <p className="hidden text-xs font-medium text-slate-600 sm:block">
              Administración de plataforma
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 md:hidden"
          >
            Salir
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-20 text-slate-950 md:p-7 md:pb-7">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white p-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
          {NAV.filter((item) =>
            ["/superadmin", "/superadmin/empresas", "/superadmin/suscripciones", "/superadmin/planes", "/superadmin/actividad"].includes(item.href),
          ).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 py-1 text-xs font-bold text-slate-700"
            >
              <DashboardIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
