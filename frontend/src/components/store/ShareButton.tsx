"use client";

import { useEffect, useState } from "react";

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
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(url ? new URL(url, window.location.origin).toString() : window.location.href);
  }, [url]);

  function shareUrl() {
    return currentUrl || (typeof window !== "undefined" ? window.location.href : "");
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

  const text = [title, description, currentUrl].filter(Boolean).join("\n");
  const whatsappHref = currentUrl ? `https://wa.me/?text=${encodeURIComponent(text)}` : "#";
  const facebookHref = currentUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}` : "#";

  return (
    <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Compartir producto">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100" aria-label="Compartir por WhatsApp">
        <span aria-hidden>💬</span> WhatsApp
      </a>
      <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100" aria-label="Compartir por Facebook">
        <span aria-hidden>f</span> Facebook
      </a>
      <button type="button" onClick={share} style={{ color: accent }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-black transition hover:bg-slate-50">
        🔗 {copied ? "Copiado" : "Más"}
      </button>
    </div>
  );
}
