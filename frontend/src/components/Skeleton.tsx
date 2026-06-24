/** Bloque gris animado para estados de carga. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}
