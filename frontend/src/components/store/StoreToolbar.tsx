import { SortSelect } from "@/components/store/SortSelect";

/** Barra de resultados: título de la sección + contador + "Ordenar por". */
export function StoreToolbar({
  subdomain,
  title,
  total,
  sort,
  showSort = true,
}: {
  subdomain: string;
  title: string;
  total: number;
  sort?: string;
  showSort?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
        <p className="text-sm font-medium text-slate-500">
          {total} {total === 1 ? "producto" : "productos"}
        </p>
      </div>
      {showSort && total > 1 && <SortSelect subdomain={subdomain} value={sort} />}
    </div>
  );
}
