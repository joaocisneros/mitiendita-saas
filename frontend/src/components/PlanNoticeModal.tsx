"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { WHATSAPP_NUMBER } from "@/lib/contact";
import { DashboardIcon } from "@/components/DashboardIcon";

const SEEN_KEY = "mt_plan_notice";
/** Días antes del vencimiento en que empieza a avisar. */
const NOTICE_DAYS = 3;

interface Notice {
  expired: boolean;
  title: string;
  text: string;
  whatsapp: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Días que faltan para la fecha (0 = vence hoy, negativo = ya venció). */
function daysUntil(value: string) {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function buildNotice(
  plan: Awaited<ReturnType<typeof adminApi.planStatus>>,
  storeName: string,
): Notice | null {
  if (!plan.currentPeriodEndsAt && plan.subscriptionStatus !== "past_due") return null;
  const days = plan.currentPeriodEndsAt ? daysUntil(plan.currentPeriodEndsAt) : -1;
  if (days > NOTICE_DAYS) return null;

  const trial = plan.subscriptionStatus === "trial";
  const what = trial ? "prueba" : "plan";
  const title =
    days < 0
      ? trial ? "Tu prueba gratuita terminó" : "Tu plan venció"
      : days === 0
        ? `Tu ${what} termina hoy`
        : `Te ${days === 1 ? "queda 1 día" : `quedan ${days} días`} de ${what}`;
  const text = trial
    ? "Elige un plan para seguir usando MiTiendita."
    : "Renueva tu plan para seguir usando MiTiendita.";
  const number = (plan.supportWhatsapp || WHATSAPP_NUMBER).replace(/\D/g, "");
  const message = `Hola, soy de la tienda ${storeName}. Quiero ${trial ? "elegir un plan" : "renovar mi plan"}.`;
  return { expired: days < 0, title, text, whatsapp: `https://wa.me/${number}?text=${encodeURIComponent(message)}` };
}

/**
 * Aviso de prueba gratuita o plan por vencer. Aparece una vez al día, desde
 * 3 días antes del vencimiento, con un botón para escribir al administrador.
 */
export function PlanNoticeModal({ storeName }: { storeName: string }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === today()) return;
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    let alive = true;
    adminApi
      .planStatus()
      .then((plan) => alive && setNotice(buildNotice(plan, storeName)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [storeName]);

  useEffect(() => {
    if (!notice) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notice]);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, today());
    } catch {
      /* sin almacenamiento: volverá a aparecer al recargar */
    }
    setNotice(null);
  }

  if (!notice) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-notice-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1.5 ${notice.expired ? "bg-red-500" : "bg-gradient-to-r from-violet-600 to-fuchsia-500"}`} />
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>

        <div className="px-7 pb-6 pt-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${
              notice.expired ? "bg-red-50 ring-1 ring-red-100" : "bg-violet-50 ring-1 ring-violet-100"
            }`}
            aria-hidden
          >
            {notice.expired ? "⏰" : "🎁"}
          </div>
          <h2 id="plan-notice-title" className="mt-4 text-xl font-black text-slate-950">{notice.title}</h2>
          <p className="mt-1.5 text-sm font-medium text-slate-600">{notice.text}</p>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <a
              href={notice.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-green-200 transition hover:bg-green-700"
            >
              <DashboardIcon name="whatsapp" className="h-4 w-4" />
              Hablar por WhatsApp
            </a>
            <a
              href="/#precios"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-bold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-50"
            >
              <DashboardIcon name="plans" className="h-4 w-4" />
              Ver planes
            </a>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 py-3 text-center">
          <button onClick={close} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Recordar luego
          </button>
        </div>
      </div>
    </div>
  );
}
