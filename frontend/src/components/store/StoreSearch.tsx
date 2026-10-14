/** Buscador de la tienda (server). El color y el placeholder vienen del rubro. */
export function StoreSearch({
  subdomain,
  accent,
  placeholder,
  defaultValue,
  category,
}: {
  subdomain: string;
  accent: string;
  placeholder: string;
  defaultValue?: string;
  category?: string;
}) {
  return (
    <form className="mb-4 flex w-full gap-2" action={`/tienda/${subdomain}`}>
      {category && <input type="hidden" name="category" value={category} />}
      <input
        name="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
      />
      <button
        style={{ backgroundColor: accent }}
        className="rounded-xl px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
      >
        Buscar
      </button>
    </form>
  );
}
