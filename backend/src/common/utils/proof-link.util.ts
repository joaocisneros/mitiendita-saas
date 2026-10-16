import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Firma de los enlaces cortos del comprobante (/c, /ad, /s). Solo quien subió
 * el comprobante recibe el enlace firmado (para enviarlo por WhatsApp a la
 * tienda); con solo el código del pedido ya no se puede ver la foto del pago.
 */
export type ProofLinkKind = 'c' | 'ad' | 's';

function secret(): string {
  return (
    process.env.PROOF_LINK_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    'dev-proof-link-secret'
  );
}

export function proofKey(kind: ProofLinkKind, code: string): string {
  return createHmac('sha256', secret())
    .update(`${kind}:${code}`)
    .digest('base64url')
    .slice(0, 22);
}

export function isValidProofKey(
  kind: ProofLinkKind,
  code: string,
  key: unknown,
): boolean {
  if (typeof key !== 'string' || !key) return false;
  const expected = Buffer.from(proofKey(kind, code));
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
