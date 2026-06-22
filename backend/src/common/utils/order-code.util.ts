import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusión

/** Genera un código público de pedido tipo "MT-7K3P9Q". */
export function generateOrderCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `MT-${code}`;
}
