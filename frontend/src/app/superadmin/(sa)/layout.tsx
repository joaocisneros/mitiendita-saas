"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSuperToken, getSuperToken } from "@/lib/superadmin-api";

export default function SaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSuperToken()) router.replace("/superadmin/login");
    else setReady(true);
  }, [router]);

  if (!ready)
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gray-900 text-gray-400">
        Cargando...
      </div>
    );

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gray-900">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-extrabold text-white">
          MiTiendita <span className="text-violet-400">ADMIN</span>
        </span>
        <button
          onClick={() => {
            clearSuperToken();
            router.replace("/superadmin/login");
          }}
          className="text-sm text-gray-400 hover:text-white"
        >
          Cerrar sesión
        </button>
      </header>
      <main className="flex-1 p-5">{children}</main>
    </div>
  );
}
