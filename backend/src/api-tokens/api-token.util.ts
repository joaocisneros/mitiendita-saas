import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** Módulos que el superadmin puede habilitar en el token de UNA tienda. */
export const COMPANY_SCOPES = [
  'pedidos',
  'productos',
  'clientes',
  'inventario',
  'reportes',
  'citas',
  'suscripciones',
] as const;
export type CompanyScope = (typeof COMPANY_SCOPES)[number];

/** Módulos del propio superadmin (mismos que su menú lateral). */
export const PLATFORM_SCOPES = [
  'empresas',
  'usuarios',
  'planes',
  'suscripciones',
  'actividad',
  'whatsapp',
  'configuracion',
] as const;
export type PlatformScope = (typeof PLATFORM_SCOPES)[number];

/** Genera un token nuevo: `mt_live_<43 caracteres base64url>`. */
export function generateApiToken(): { token: string; prefix: string; hash: string; encrypted: string } {
  const token = `mt_live_${randomBytes(32).toString('base64url')}`;
  return {
    token,
    prefix: token.slice(0, 14),
    hash: hashApiToken(token),
    encrypted: encryptApiToken(token),
  };
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function encryptionKey(): Buffer {
  const hex = process.env.API_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('API_TOKEN_ENCRYPTION_KEY debe ser una clave de 32 bytes en hex (64 caracteres).');
  }
  return Buffer.from(hex, 'hex');
}

/** Cifra el token (AES-256-GCM) para poder mostrarlo de nuevo más adelante. */
export function encryptApiToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/** Descifra el valor guardado en `tokenEncrypted` para mostrárselo de nuevo al superadmin. */
export function decryptApiToken(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
