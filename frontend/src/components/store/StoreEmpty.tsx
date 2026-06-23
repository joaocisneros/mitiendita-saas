/** Estado vacío tematizado para las tiendas (sin productos/servicios). */
export function StoreEmpty({
  accent,
  message,
  icon = "🗂️",
}: {
  accent: string;
  message: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-black/5">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        {icon}
      </div>
      <p className="mt-4 font-semibold text-slate-700">{message}</p>
      <p className="mt-1 text-sm text-slate-400">
        Vuelve pronto, estamos preparando todo. ✨
      </p>
    </div>
  );
}
