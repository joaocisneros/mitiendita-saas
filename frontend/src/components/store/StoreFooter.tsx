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
                {store.instagramUrl && (
                  <Social href={store.instagramUrl} label="Instagram" color="#E4405F">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm6.4-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" /></svg>
                  </Social>
                )}
                {store.facebookUrl && (
                  <Social href={store.facebookUrl} label="Facebook" color="#1877F2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6 4.39 10.97 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.04 24 18.07 24 12.07z" /></svg>
                  </Social>
                )}
                {store.tiktokUrl && (
                  <Social href={store.tiktokUrl} label="TikTok" color="#010101">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                  </Social>
                )}
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

function Social({ href, label, color, children }: { href: string; label: string; color: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      style={{ color }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 transition hover:scale-110 hover:brightness-110"
    >
      {children}
    </a>
  );
}
