import type { Metadata } from "next";
import { getPublicLegal } from "@/lib/api";
import { buildTerms, type LegalOwner } from "@/lib/legal-texts";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Términos y condiciones · MiTiendita",
  description: "Condiciones de uso de MiTiendita para negocios y compradores, conforme a la ley peruana.",
};

export default async function TermsPage() {
  const legal = await getPublicLegal();
  const owner: LegalOwner = {
    platformName: legal?.platformName || "MiTiendita",
    legalName: legal?.legalName ?? null,
    legalRuc: legal?.legalRuc ?? null,
    legalAddress: legal?.legalAddress ?? null,
  };
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Las reglas para usar MiTiendita: qué ofrece la plataforma, qué le corresponde a cada negocio y cómo funcionan las compras en las tiendas."
      text={buildTerms(owner)}
      legal={legal}
      other={{ href: "/privacidad", label: "Política de privacidad" }}
    />
  );
}
