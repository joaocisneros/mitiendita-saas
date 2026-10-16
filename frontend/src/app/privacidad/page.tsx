import type { Metadata } from "next";
import { getPublicLegal } from "@/lib/api";
import { buildPrivacy, type LegalOwner } from "@/lib/legal-texts";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad · MiTiendita",
  description: "Cómo MiTiendita trata y protege los datos personales, conforme a la Ley N.° 29733.",
};

export default async function PrivacyPage() {
  const legal = await getPublicLegal();
  const owner: LegalOwner = {
    platformName: legal?.platformName || "MiTiendita",
    legalName: legal?.legalName ?? null,
    legalRuc: legal?.legalRuc ?? null,
    legalAddress: legal?.legalAddress ?? null,
  };
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Qué datos personales tratamos, para qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos."
      text={buildPrivacy(owner)}
      legal={legal}
      other={{ href: "/terminos", label: "Términos y condiciones" }}
    />
  );
}
