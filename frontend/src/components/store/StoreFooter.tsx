import type { StoreBrand } from "@/lib/types";

/** Pie de página profesional: contacto, confianza y atribución. */
export function StoreFooter({ store }: { store: StoreBrand }) {
  const phone = store.whatsappNumber?.replace(/\D/g, "");
  const hasYape = Boolean(store.yapeNumber || store.yapeQrUrl);
  const hasPlin = Boolean(store.plinNumber || store.plinQrUrl);
  return (
    <footer className="mt-4 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt={store.name} className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-white">{store.name.charAt(0).toUpperCase()}</span>
              )}
              <p className="text-base font-black text-slate-900">{store.name}</p>
            </div>
            {store.description && (
              <p className="mt-2 text-sm leading-6 text-slate-500">{store.description}</p>
            )}
            {(store.instagramUrl || store.facebookUrl || store.tiktokUrl) && (
              <div className="mt-3 flex gap-2">
                {store.instagramUrl && <Social href={store.instagramUrl} label="Instagram">📸</Social>}
                {store.facebookUrl && <Social href={store.facebookUrl} label="Facebook">👍</Social>}
                {store.tiktokUrl && <Social href={store.tiktokUrl} label="TikTok">🎵</Social>}
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-slate-600">
            <p className="font-bold text-slate-800">Contacto</p>
            {store.storeAddress && <p>📍 {store.storeAddress}</p>}
            {store.hours && <p>🕐 {store.hours}</p>}
            {phone && (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-green-600 hover:text-green-700"
              >
                💬 WhatsApp
              </a>
            )}
          </div>

          {(hasYape || hasPlin) && (
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-bold text-slate-800">Métodos de pago</p>
              <div className="flex flex-wrap gap-2">
                {hasYape && <span className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-200">Yape</span>}
                {hasPlin && <span className="rounded-lg bg-teal-100 px-3 py-1.5 text-xs font-black text-teal-700 ring-1 ring-teal-200">Plin</span>}
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-sm text-slate-600">
            <p className="font-bold text-slate-800">Tu compra está protegida</p>
            <p>🔒 Pago seguro</p>
            <p>✅ Confirmación por WhatsApp</p>
            <p>🧾 Comprobante de cada pedido</p>
          </div>
        </div>

        {store.hours && (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            🕐 Horario de atención: {store.hours}
          </p>
        )}

        <div className="mt-7 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</p>
          <p>Hecho con <span className="font-bold text-violet-600">MiTiendita</span> 🛍️</p>
        </div>
      </div>
    </footer>
  );
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-base ring-1 ring-slate-200 transition hover:bg-slate-200"
    >
      {children}
    </a>
  );
}
