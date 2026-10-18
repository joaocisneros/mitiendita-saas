"use client";

import Image from "next/image";
import Link from "next/link";

export type StockAction = "entry" | "return" | "adjustment";

/** Las 3 formas de cambiar la cantidad, explicadas para la dueña. */
export const STOCK_ACTIONS: ReadonlyArray<{ id: StockAction; icon: string; title: string; sub: string; rule: string; adds: boolean }> = [
  { id: "entry", icon: "➕", title: "Llegó", sub: "mercadería", rule: "Se suma", adds: true },
  { id: "return", icon: "↩", title: "Devolución", sub: "de una clienta", rule: "Se suma", adds: true },
  { id: "adjustment", icon: "✎", title: "Corregir", sub: "conteo", rule: "Se reemplaza", adds: false },
];

const HEADER_STYLE: Record<StockAction, { title: string; band: string }> = {
  entry: { title: "Llegó mercadería", band: "from-emerald-500 to-teal-500" },
  return: { title: "Devolución de una clienta", band: "from-sky-500 to-indigo-500" },
  adjustment: { title: "Corregir conteo", band: "from-amber-400 to-orange-500" },
};

/**
 * Encabezado de cada ventana, con el color de la acción (verde, celeste o ámbar),
 * la foto del producto para reconocerlo de un vistazo y si suma o reemplaza.
 */
export function ActionHeader({
  action,
  productName,
  imageUrl,
  detail,
}: {
  action: StockAction;
  productName: string;
  imageUrl?: string | null;
  detail?: React.ReactNode;
}) {
  const info = STOCK_ACTIONS.find((a) => a.id === action)!;
  const style = HEADER_STYLE[action];
  return (
    <div className={`mr-10 flex items-center gap-4 rounded-2xl bg-gradient-to-r ${style.band} p-3 pr-4 text-white shadow-sm`}>
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/90 text-3xl ring-2 ring-white/70">
        {imageUrl ? <Image src={imageUrl} alt={productName} fill sizes="64px" className="object-cover" /> : <span aria-hidden>📦</span>}
      </span>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-black">
          <span aria-hidden>{info.icon}</span> {style.title}
        </span>
        <h2 className="mt-1 truncate text-xl font-black leading-tight">{productName}</h2>
        {detail && <p className="mt-1 inline-block rounded-lg bg-white/90 px-2 py-0.5 text-xs text-slate-600">{detail}</p>}
      </div>
      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-800 shadow-sm">{info.rule}</span>
    </div>
  );
}

/** Categoría y tipo del producto, bloqueados: se cambian solo en Productos > Editar. */
export function LockedInfo({ categoryName, typeLabel }: { categoryName?: string | null; typeLabel: string }) {
  const box = (label: string, value: string, warn = false) => (
    <div>
      <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
      <div className={`flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold leading-tight ring-1 ${warn ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>
        <span aria-hidden>🔒</span>
        <span>{value}</span>
      </div>
    </div>
  );
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {box("Categoría", categoryName || "Sin categoría", !categoryName)}
        {box("Tipo de producto", typeLabel)}
      </div>
      <Link href="/panel/productos" className="mt-1 inline-block text-xs font-semibold text-violet-700 hover:underline">
        ¿Algo está mal? Cámbialo en Productos
      </Link>
    </div>
  );
}

/** "Repartido 7 de 10": cuánto falta repartir entre tallas o colores. */
export function SplitStatus({ total, assigned }: { total: number; assigned: number }) {
  const ok = total === assigned;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
      Repartido {assigned} de {total}
      {ok ? " ✓" : assigned < total ? ` · faltan ${total - assigned}` : ` · sobran ${assigned - total}`}
    </span>
  );
}

/** Motivos frecuentes de cada acción, para llenar la nota con un toque. */
const REASONS: Record<StockAction, string[]> = {
  entry: ["Compra al proveedor", "Reposición"],
  return: ["Cambio de talla", "No le quedó", "No le gustó"],
  adjustment: ["Conteo del almacén", "Producto dañado", "Se perdió", "Error al registrar"],
};

export function ReasonChips({ action, value, onPick }: { action: StockAction; value: string; onPick: (reason: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {REASONS[action].map((reason) => (
        <button
          key={reason}
          type="button"
          onClick={() => onPick(reason)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition ${
            value === reason ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-violet-300"
          }`}
        >
          {reason}
        </button>
      ))}
    </div>
  );
}

/** Unidades vendidas del producto (tienda + crédito): tope de lo que se puede devolver. */
export const soldUnits = (product: { soldOnline?: number; soldCredit?: number }) => (product.soldOnline ?? 0) + (product.soldCredit ?? 0);
