"use client";

import { useState } from "react";

/** Comparte la página actual o una URL específica del producto. */
export function ShareButton({
  title,
  description,
  accent = "#0f172a",
  url,
}: {
  title: string;
  description?: string;
  accent?: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);
  function shareUrl() {
    return (
      typeof window !== "undefined"
        ? url
          ? new URL(url, window.location.origin).toString()
          : window.location.href
        : ""
    );
  }
  function share() {
    const currentUrl = shareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, text: description, url: currentUrl }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  function open(network: "whatsapp" | "facebook") {
    const currentUrl = shareUrl();
    const text = [title, description, currentUrl].filter(Boolean).join("\n");
    const target = network === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Compartir producto">
      <button type="button" onClick={() => open("whatsapp")} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100" aria-label="Compartir por WhatsApp">
        <span aria-hidden>💬</span> WhatsApp
      </button>
      <button type="button" onClick={() => open("facebook")} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100" aria-label="Compartir por Facebook">
        <span aria-hidden>f</span> Facebook
      </button>
      <button type="button" onClick={share} style={{ color: accent }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-black transition hover:bg-slate-50">
        🔗 {copied ? "Copiado" : "Más"}
      </button>
    </div>
  );
}
