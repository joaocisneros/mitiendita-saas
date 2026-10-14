import type { ReactNode } from "react";

export interface ReceiptStore {
  name: string;
  logoUrl: string | null;
  address: string | null;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "•";
}

export function formatReceiptDate(value: string): string {
  return new Date(value).toLocaleString("es-PE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function ReceiptRule() {
  return <div className="my-3 border-t border-dashed border-slate-300" />;
}

export function ReceiptShell({ store, title, code, createdAt, accent = "violet", children }: {
  store: ReceiptStore; title: string; code: string; createdAt: string;
  accent?: "violet" | "amber"; children: ReactNode;
}) {
  const titleClass = accent === "amber" ? "text-amber-800" : "text-indigo-800";
  return (
    <article className="thermal-receipt mx-auto w-[80mm] max-w-full overflow-hidden rounded-lg bg-white px-4 py-5 font-sans text-slate-700 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 print:rounded-none print:text-black print:shadow-none print:ring-0">
      <header className="text-center">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt={`Logo de ${store.name}`} className="mx-auto h-14 w-14 rounded-md object-cover grayscale" />
        ) : (
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border-2 border-indigo-700 text-base font-bold text-indigo-700">{initials(store.name)}</span>
        )}
        <h1 className="mt-2 text-[16px] font-extrabold uppercase leading-tight text-slate-900">{store.name}</h1>
        {store.address && <p className="mx-auto mt-1 max-w-[250px] text-[10px] leading-tight text-slate-500">{store.address}</p>}
      </header>
      <div className="my-3 border-y border-indigo-200 bg-indigo-50/60 px-2 py-2.5 text-center print:border-black print:bg-white">
        <div className={`text-[12px] font-extrabold uppercase text-indigo-800 print:text-black ${titleClass}`}>{title}</div>
        <div className="mt-1 font-mono text-[11px] font-semibold text-slate-800">N.º {code}</div>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 text-[9px] text-slate-500 [font-variant-numeric:tabular-nums] print:text-black">
          <span className="text-left font-semibold">FECHA DE EMISIÓN</span>
          <time className="text-right">{formatReceiptDate(createdAt)}</time>
        </div>
      </div>
      {children}
      <footer className="mt-4 border-t border-dashed border-slate-300 pt-3 text-center">
        <p className="text-[10px] font-semibold uppercase text-slate-700">Gracias por su preferencia</p>
        <p className="mt-3 text-[9px] font-medium leading-relaxed text-slate-500 print:text-black">DOCUMENTO INTERNO SIN VALIDEZ TRIBUTARIA<br />NO ES BOLETA NI FACTURA ELECTRÓNICA</p>
        <p className="mt-2 text-[8px] text-slate-500">Generado por MiTiendita</p>
      </footer>
    </article>
  );
}
