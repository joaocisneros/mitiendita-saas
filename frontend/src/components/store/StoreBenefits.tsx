import type { StoreArchetype } from "@/lib/business-categories";

type Benefit = { icon: string; title: string; sub: string };

const BY_ARCHETYPE: Record<StoreArchetype, Benefit[]> = {
  catalogo: [
    { icon: "🚚", title: "Envío rápido", sub: "Coordina tu entrega" },
    { icon: "🔒", title: "Pago seguro", sub: "Yape o Plin" },
    { icon: "🧾", title: "Comprobante", sub: "De cada pedido" },
    { icon: "💬", title: "Atención directa", sub: "Por WhatsApp" },
  ],
  carta: [
    { icon: "🍽️", title: "Recién hecho", sub: "Al momento" },
    { icon: "🚚", title: "Delivery / recojo", sub: "Como prefieras" },
    { icon: "🔒", title: "Pago seguro", sub: "Yape o Plin" },
    { icon: "💬", title: "Pide por WhatsApp", sub: "Rápido y fácil" },
  ],
  servicios: [
    { icon: "📅", title: "Reserva fácil", sub: "En segundos" },
    { icon: "🔒", title: "Pago seguro", sub: "Adelanto por Yape/Plin" },
    { icon: "📞", title: "Sin llamadas", sub: "Todo por WhatsApp" },
    { icon: "✨", title: "Atención personalizada", sub: "Te asesoramos" },
  ],
  digital: [
    { icon: "⚡", title: "Activación rápida", sub: "Al toque" },
    { icon: "🔒", title: "Pago seguro", sub: "Yape o Plin" },
    { icon: "🧾", title: "Comprobante", sub: "Válido" },
    { icon: "💬", title: "Soporte directo", sub: "Por WhatsApp" },
  ],
};

/** Tira de beneficios (íconos + texto) al pie del contenido de la tienda. */
export function StoreBenefits({ archetype }: { archetype: StoreArchetype }) {
  const items = BY_ARCHETYPE[archetype] ?? BY_ARCHETYPE.catalogo;
  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((b) => (
          <div key={b.title} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">{b.icon}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{b.title}</p>
              <p className="truncate text-xs font-medium text-slate-500">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
