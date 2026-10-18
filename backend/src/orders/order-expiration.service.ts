import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { adjustVariantStock } from './variant-stock.util';

/**
 * Libera las reservas de stock de pedidos que nunca se pagaron:
 * - vencidos: pedido pendiente que superó su tiempo sin comprobante → "expired";
 * - cancelados por el cliente antes de pagar → "cancelled".
 * (Subir comprobante pone reservationExpiresAt en null, así que esos no vencen.)
 */
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Cada minuto. En un hosting que se duerme no corre mientras duerme, por eso
   * también se llama al hacer un pedido y al abrir el inventario. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireAll(): Promise<void> {
    await this.expireStaleReservations();
  }

  /** Vence las reservas pasadas de hora (de una tienda o de todas). */
  async expireStaleReservations(companyId?: string): Promise<number> {
    const stale = await this.prisma.order.findMany({
      where: {
        status: 'pending',
        reservationExpiresAt: { not: null, lt: new Date() },
        ...(companyId ? { companyId } : {}),
      },
      select: { id: true },
      take: 50,
    });
    let released = 0;
    for (const { id } of stale) {
      const done = await this.prisma.$transaction((tx) =>
        this.releaseReservation(
          tx,
          id,
          'expired',
          'Reserva vencida automáticamente',
        ),
      );
      if (done) released++;
    }
    // Pedidos de versiones antiguas: pago rechazado pero el pedido quedó
    // "pendiente" apartando stock sin vencer nunca. Se cierran y devuelven.
    const rejectedLeftovers = await this.prisma.order.findMany({
      where: {
        status: 'pending',
        paymentStatus: 'rejected',
        ...(companyId ? { companyId } : {}),
      },
      select: { id: true },
      take: 50,
    });
    for (const { id } of rejectedLeftovers) {
      const done = await this.prisma.$transaction((tx) =>
        this.releaseReservation(
          tx,
          id,
          'cancelled',
          'Pago rechazado: se libera el stock (corrección automática)',
        ),
      );
      if (done) released++;
    }

    if (released) {
      this.logger.log(`${released} reserva(s) vencida(s) y liberada(s).`);
    }
    return released;
  }

  /**
   * Devuelve al stock lo reservado por un pedido aún pendiente y lo cierra.
   * Relee el pedido dentro de la transacción: si ya cambió, no hace nada.
   */
  async releaseReservation(
    tx: Prisma.TransactionClient,
    orderId: string,
    toStatus: 'expired' | 'cancelled',
    comment: string,
  ): Promise<boolean> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        companyId: true,
        stockReserved: true,
        items: { select: { productId: true, variant: true, quantity: true } },
      },
    });
    if (order?.status !== 'pending') return false; // evita carreras

    // Un pedido sin comprobante nunca apartó stock: solo se cierra.
    for (const item of order.stockReserved ? order.items : []) {
      if (!item.productId) continue;
      await tx.$executeRaw`
        UPDATE products SET reserved = GREATEST(0, reserved - ${item.quantity})
        WHERE id = ${item.productId} AND company_id = ${order.companyId}`;
      await adjustVariantStock(
        tx,
        item.productId,
        item.variant,
        item.quantity,
        'release',
      );
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        reservationExpiresAt: null,
        stockReserved: false,
        ...(toStatus === 'cancelled' ? { cancelledAt: new Date() } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, fromStatus: 'pending', toStatus, comment },
    });
    return true;
  }
}
