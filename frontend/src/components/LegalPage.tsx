import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicLegal } from "@/lib/api";
import { supportNumber } from "@/lib/contact";
import { LEGAL_UPDATED_AT } from "@/lib/legal-texts";

/**
 * Página pública de un documento legal (términos o privacidad).
 * El texto usa un formato sencillo: "## " título, "- " viñeta, línea en blanco = párrafo.
 */
export function LegalPage({
  title,
  intro,
  text,
  legal,
  other,
}: {
  title: string;
  intro: string;
  text: string;
  legal: PublicLegal | null;
  other: { href: string; label: string };
}) {
  const whatsapp = supportNumber(legal?.supportWhatsapp);
  const email = legal?.supportEmail;

  return (
    <main className="flex-1 bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            Mi<span className="text-violet-600">Tiendita</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-violet-700">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-sm font-bold uppercase tracking-wide text-violet-700">Información legal</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">{intro}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">Última actualización: {LEGAL_UPDATED_AT}</p>

        <article className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <LegalText text={text} />
        </article>

        <section className="mt-6 rounded-2xl bg-violet-50 p-6 ring-1 ring-violet-200">
          <h2 className="text-lg font-black text-slate-950">Contacto</h2>
          <p className="mt-1 text-sm text-slate-700">
            ¿Tienes dudas o quieres ejercer tus derechos sobre tus datos? Escríbenos:
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"
            >
              WhatsApp: +{whatsapp}
            </a>
            {email && (
              <a
                href={`mailto:${email}`}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
              >
                {email}
              </a>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-sm text-slate-500">
          Lee también: <Link href={other.href} className="font-semibold text-violet-700 hover:underline">{other.label}</Link>
        </p>
      </div>
    </main>
  );
}

/** Cada línea es un párrafo, salvo los títulos ("## ") y las viñetas ("- ") seguidas. */
function LegalText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length} className="mt-3 list-disc space-y-1.5 pl-6 leading-7 text-slate-700">
          {bullets.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }
    flushBullets();
    if (!line) continue;
    blocks.push(
      line.startsWith("## ") ? (
        <h2 key={blocks.length} className="mt-8 text-lg font-black text-slate-950 first:mt-0">
          {line.slice(3)}
        </h2>
      ) : (
        <p key={blocks.length} className="mt-3 leading-7 text-slate-700">
          {line}
        </p>
      ),
    );
  }
  flushBullets();
  return <>{blocks}</>;
}
