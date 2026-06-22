import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Vence las reservas no pagadas: si un pedido pendiente supera su tiempo
 * de reserva sin comprobante, pasa a "expired" y libera el stock.
 * (Subir comprobante pone reservationExpiresAt en null, así que esos no vencen.)
 */
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleReservations(): Promise<void> {
    const now = new Date();
    const stale = await this.prisma.order.findMany({
      where: {
        status: 'pending',
        reservationExpiresAt: { not: null, lt: now },
      },
      include: { items: true },
      take: 50,
    });
    if (stale.length === 0) return;

    for (const order of stale) {
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });
        if (fresh?.status !== 'pending') return; // ya cambió, evitar carrera

        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.$executeRaw`
            UPDATE products SET reserved = GREATEST(0, reserved - ${item.quantity})
            WHERE id = ${item.productId} AND company_id = ${order.companyId}`;
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'expired' },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: 'pending',
            toStatus: 'expired',
            comment: 'Reserva vencida automáticamente',
          },
        });
      });
    }
    this.logger.log(`${stale.length} reserva(s) vencida(s) y liberada(s).`);
  }
}
