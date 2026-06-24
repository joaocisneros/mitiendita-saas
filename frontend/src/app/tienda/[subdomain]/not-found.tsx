import Link from "next/link";

/** Página mostrada cuando una tienda (subdominio) no existe o no está disponible. */
export default function StoreNotFound() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-5xl shadow-lg ring-1 ring-slate-200">
        🛍️
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
        Esta tienda no está disponible
      </h1>
      <p className="mt-2 max-w-md text-sm font-medium text-slate-600">
        El enlace puede estar mal escrito, o la tienda fue cerrada o aún no se
        ha publicado. Revisa la dirección e inténtalo de nuevo.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-violet-700"
      >
        Ir al inicio
      </Link>
      <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        MiTiendita
      </p>
    </div>
  );
}
