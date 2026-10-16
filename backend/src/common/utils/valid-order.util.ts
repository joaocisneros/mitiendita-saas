import type { Prisma } from '../../../generated/prisma/client';

/**
 * Pedido válido = compra completada: pago aprobado y no cancelado ni vencido.
 * Los checkouts abandonados, rechazados o cancelados no cuentan como pedidos
 * ni convierten a alguien en cliente.
 */
export const VALID_ORDER = {
  paymentStatus: 'approved',
  status: { notIn: ['cancelled', 'expired'] },
} satisfies Prisma.OrderWhereInput;

/**
 * Cliente visible: tiene al menos una compra completada, o no tiene pedidos
 * porque llegó por una cita o suscripción (rubros de servicios y digital).
 * Así solo se ocultan quienes iniciaron un pedido y nunca lo completaron.
 */
export const BUYER_CUSTOMER = {
  OR: [{ orders: { some: VALID_ORDER } }, { orders: { none: {} } }],
} satisfies Prisma.CustomerWhereInput;
