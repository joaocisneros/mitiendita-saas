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
    <form className="mb-5 flex gap-2" action={`/tienda/${subdomain}`}>
      {category && <input type="hidden" name="category" value={category} />}
      <input
        name="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-slate-400"
      />
      <button
        style={{ backgroundColor: accent }}
        className="rounded-xl px-4 text-sm font-bold text-white"
      >
        Buscar
      </button>
    </form>
  );
}
