import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import type { OrderStatus } from '../../generated/prisma/enums';

// Transiciones permitidas (según la especificación).
const TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: [],
};

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /** Lista de pedidos del panel, paginada y con filtros. */
  async list(
    companyId: string,
    q: { status?: string; paymentStatus?: string; search?: string; page?: number; limit?: number },
  ) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const where = {
      companyId,
      ...(q.status ? { status: q.status as OrderStatus } : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus as never } : {}),
      ...(q.search
        ? {
            OR: [
              { publicCode: { contains: q.search } },
              { customerName: { contains: q.search } },
              { customerPhone: { contains: q.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          publicCode: true,
          status: true,
          paymentStatus: true,
          deliveryMethod: true,
          customerName: true,
          customerPhone: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async get(companyId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: {
        items: true,
        payment: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return order;
  }

  /** Aprueba el pago: confirma el pedido y convierte la reserva en salida real. */
  async approvePayment(companyId: string, id: string, userId: string) {
    const order = await this.get(companyId, id);
    if (order.payment?.status === 'approved') return this.get(companyId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: 'approved',
          validatedAt: new Date(),
          validatedByUserId: userId,
        },
      });

      // Si estaba pendiente, lo confirmamos y comprometemos el stock.
      if (order.status === 'pending') {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.$executeRaw`
            UPDATE products
            SET stock = GREATEST(0, stock - ${item.quantity}),
                reserved = GREATEST(0, reserved - ${item.quantity})
            WHERE id = ${item.productId} AND company_id = ${companyId}`;
          await tx.stockMovement.create({
            data: {
              companyId,
              productId: item.productId,
              type: 'sale',
              quantity: -item.quantity,
              reason: `Venta pedido ${order.publicCode}`,
              createdByUserId: userId,
            },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'confirmed',
            paymentStatus: 'approved',
            confirmedAt: new Date(),
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: 'pending',
            toStatus: 'confirmed',
            changedByUserId: userId,
            comment: 'Pago aprobado',
          },
        });
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'approved' },
        });
      }
    });

    return this.get(companyId, id);
  }

  /** Rechaza el pago. El pedido NO se elimina; el cliente puede resubir. */
  async rejectPayment(
    companyId: string,
    id: string,
    userId: string,
    comment?: string,
  ) {
    const order = await this.get(companyId, id);
    await this.prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: 'rejected',
        rejectionComment: comment ?? null,
        validatedAt: new Date(),
        validatedByUserId: userId,
      },
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'rejected' },
    });
    return this.get(companyId, id);
  }

  /** Cambia el estado del pedido validando transiciones y ajustando stock. */
  async changeStatus(
    companyId: string,
    id: string,
    newStatus: OrderStatus,
    userId: string,
    comment?: string,
  ) {
    const order = await this.get(companyId, id);
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede pasar de "${order.status}" a "${newStatus}".`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Efectos sobre el stock al cancelar.
      if (newStatus === 'cancelled') {
        for (const item of order.items) {
          if (!item.productId) continue;
          if (order.status === 'pending') {
            // Reserva aún viva: liberarla.
            await tx.$executeRaw`
              UPDATE products SET reserved = GREATEST(0, reserved - ${item.quantity})
              WHERE id = ${item.productId} AND company_id = ${companyId}`;
          } else {
            // Ya estaba confirmado (stock comprometido): devolverlo.
            await tx.$executeRaw`
              UPDATE products SET stock = stock + ${item.quantity}
              WHERE id = ${item.productId} AND company_id = ${companyId}`;
            await tx.stockMovement.create({
              data: {
                companyId,
                productId: item.productId,
                type: 'cancellation',
                quantity: item.quantity,
                reason: `Cancelación pedido ${order.publicCode}`,
                createdByUserId: userId,
              },
            });
          }
        }
      }

      const data: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'confirmed') data.confirmedAt = new Date();
      if (newStatus === 'delivered') data.deliveredAt = new Date();
      if (newStatus === 'cancelled') data.cancelledAt = new Date();

      await tx.order.update({ where: { id: order.id }, data });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          changedByUserId: userId,
          comment: comment ?? null,
        },
      });
    });

    // Pedido finalizado (entregado/cancelado): el comprobante ya no se necesita
    // → se borra la foto para no acumular almacenamiento.
    if (
      (newStatus === 'delivered' || newStatus === 'cancelled') &&
      order.payment?.proofUrl
    ) {
      const proofUrl = order.payment.proofUrl;
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { proofUrl: null },
      });
      void this.media.deleteByUrl(proofUrl);
    }

    return this.get(companyId, id);
  }
}
