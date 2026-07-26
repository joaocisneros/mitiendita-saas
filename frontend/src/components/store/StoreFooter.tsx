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
            <p className="text-base font-black text-slate-900">{store.name}</p>
            {store.description && (
              <p className="mt-1 text-sm text-slate-500">{store.description}</p>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-slate-600">
            <p className="font-bold text-slate-800">Contacto</p>
            {store.storeAddress && <p>📍 {store.storeAddress}</p>}
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

        <div className="mt-7 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</p>
          <p>Hecho con <span className="font-bold text-violet-600">MiTiendita</span> 🛍️</p>
        </div>
      </div>
    </footer>
  );
}
