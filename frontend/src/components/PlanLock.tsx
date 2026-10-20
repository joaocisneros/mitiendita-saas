import { supportNumber } from "@/lib/contact";

/** WhatsApp para pedir un plan que incluya la función bloqueada. */
export function upgradeLink(supportWhatsapp: string | null | undefined, planName: string | null | undefined, feature: string) {
  const message = `Hola, mi plan${planName ? ` ${planName}` : ""} no incluye ${feature}. Quiero cambiar de plan.`;
  return `https://wa.me/${supportNumber(supportWhatsapp)}?text=${encodeURIComponent(message)}`;
}

/** Aviso cuando el plan de la tienda no incluye una función. */
export function PlanLockCard({
  title,
  text,
  feature,
  planName,
  supportWhatsapp,
}: {
  title: string;
  text: string;
  feature: string;
  planName?: string | null;
  supportWhatsapp?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-4xl" aria-hidden>
        🔒
      </p>
      <p className="mt-3 text-lg font-black text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-600">{text}</p>
      {planName && <p className="mt-2 text-xs font-bold text-slate-400">Tu plan actual: {planName}</p>}
      <a
        href={upgradeLink(supportWhatsapp, planName, feature)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700"
      >
        💬 Mejorar mi plan por WhatsApp
      </a>
    </div>
  );
}
