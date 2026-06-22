"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens, getAccess } from "@/lib/admin-api";

const NAV = [
  { href: "/panel", label: "Dashboard", icon: "📊", ready: true },
  { href: "/panel/pedidos", label: "Pedidos", icon: "🧾", ready: true },
  { href: "/panel/productos", label: "Productos", icon: "📦", ready: true },
  { href: "/panel/categorias", label: "Categorías", icon: "🏷️", ready: true },
  { href: "/panel/config", label: "Configuración", icon: "⚙️", ready: true },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccess()) {
      router.replace("/panel/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center text-gray-400">
        Cargando...
      </div>
    );
  }

  function logout() {
    clearTokens();
    router.replace("/panel/login");
  }

  return (
    <div className="flex min-h-screen flex-1 bg-gray-50">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-black/5 bg-white p-4 md:flex">
        <span className="mb-6 px-2 text-lg font-extrabold">
          Mi<span className="text-violet-600">Tiendita</span>
        </span>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => {
            const active =
              n.href === "/panel"
                ? pathname === "/panel"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          🚪 Cerrar sesión
        </button>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (móvil) */}
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 md:hidden">
          <span className="font-extrabold">
            Mi<span className="text-violet-600">Tiendita</span>
          </span>
          <button onClick={logout} className="text-sm text-red-600">
            Salir
          </button>
        </header>

        {/* Nav inferior (móvil) */}
        <nav className="order-last flex items-center justify-around border-t border-black/5 bg-white py-2 md:hidden">
          {NAV.filter((n) => n.ready).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-col items-center text-xs text-gray-600"
            >
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
