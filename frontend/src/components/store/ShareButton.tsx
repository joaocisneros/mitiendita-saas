"use client";

/** Comparte la página actual o una URL específica del producto. */
export function ShareButton({
  title,
  accent = "#0f172a",
  url,
}: {
  title: string;
  accent?: string;
  url?: string;
}) {
  function share() {
    const shareUrl =
      typeof window !== "undefined"
        ? url
          ? new URL(url, window.location.origin).toString()
          : window.location.href
        : "";
    const text = `${title} — ${shareUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url: shareUrl }).catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      style={{ color: accent }}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-bold transition hover:bg-slate-50"
    >
      🔗 Compartir
    </button>
  );
}
