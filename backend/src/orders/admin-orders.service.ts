import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import type { OrderStatus } from '../../generated/prisma/enums';
import { adjustVariantStock } from './variant-stock.util';
import { toTitleCase } from '../common/utils/text.util';

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

const SERVICE_KEYWORDS = [
  'telecom',
  'internet',
  'portabilidad',
  'streaming',
  'curso',
  'membresia',
  'academia',
  'instituto',
  'capacitacion',
  'spa',
  'barber',
  'salon',
  'belleza',
  'estetic',
  'clinica',
  'consultorio',
  'terapia',
  'hotel',
  'hostal',
  'viaje',
  'taller',
  'inmobiliaria',
  'alquiler',
  'limpieza',
  'seguridad',
];

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isServiceLikeBusiness(businessType: string | null | undefined) {
  const normalized = normalizeText(businessType);
  return SERVICE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /** Lista de pedidos del panel, paginada y con filtros. */
  async list(
    companyId: string,
    q: {
      status?: string;
      paymentStatus?: string;
      search?: string;
      page?: number;
      limit?: number;
      /** API de integraciones: incluye productos, dirección e importes. */
      withDetails?: boolean;
    },
  ) {
    const page =
      q.page && Number.isFinite(q.page) ? Math.max(1, Math.floor(q.page)) : 1;
    const limit =
      q.limit && Number.isFinite(q.limit)
        ? Math.min(100, Math.max(1, Math.floor(q.limit)))
        : 20;
    // paymentStatus admite varios valores separados por coma (ej. "pending,proof_submitted").
    const paymentStatuses = q.paymentStatus
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const where = {
      companyId,
      // Un checkout sin comprobante es solo una reserva temporal. No debe
      // mostrarse como pedido operativo en el panel del negocio.
      AND: [
        { paymentStatus: { not: 'pending' as const } },
        ...(paymentStatuses?.length === 1
          ? [{ paymentStatus: paymentStatuses[0] as never }]
          : paymentStatuses && paymentStatuses.length > 1
            ? [{ paymentStatus: { in: paymentStatuses as never[] } }]
            : []),
      ],
      ...(q.status
        ? { status: q.status as OrderStatus }
        : // "Todos" muestra solo pedidos en proceso o completados; los
          // rechazados y cancelados se revisan en sus propias pestañas.
          !paymentStatuses?.length
          ? {
              status: { notIn: ['cancelled', 'expired'] as OrderStatus[] },
              NOT: { paymentStatus: 'rejected' as const },
            }
          : {}),
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
          payment: { select: { detectedMethod: true, operationNumber: true } },
          ...(q.withDetails
            ? {
                address: true,
                reference: true,
                customerNote: true,
                subtotal: true,
                deliveryFee: true,
                confirmedAt: true,
                items: {
                  select: {
                    name: true,
                    variant: true,
                    sku: true,
                    quantity: true,
                    unitPrice: true,
                    lineTotal: true,
                  },
                },
              }
            : {}),
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map(({ payment, ...row }) => ({
        ...row,
        detectedMethod: payment?.detectedMethod ?? null,
        operationNumber: payment?.operationNumber ?? null,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async get(companyId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: {
        items: true,
        payment: true,
        history: { orderBy: { createdAt: 'asc' } },
        company: {
          select: {
            settings: { select: { businessType: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    const { company, ...rest } = order;
    return {
      ...rest,
      businessType: company.settings?.businessType ?? null,
    };
  }

  /** Aprueba el pago: confirma el pedido y convierte la reserva en salida real. */
  async approvePayment(companyId: string, id: string, userId: string) {
    const order = await this.get(companyId, id);
    if (order.payment?.status === 'approved') return this.get(companyId, id);
    if (order.payment?.status !== 'proof_submitted') {
      throw new BadRequestException(
        'El cliente todavía no ha enviado un comprobante para validar.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: 'approved',
          validatedAt: new Date(),
          validatedByUserId: userId,
        },
      });

      // La compra quedó completada: el cliente toma los datos de este pedido.
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            name: toTitleCase(order.customerName),
            ...(order.address ? { address: order.address } : {}),
            lastPurchaseAt: new Date(),
          },
        });
      }

      // Si estaba pendiente, lo confirmamos y comprometemos el stock.
      if (order.status === 'pending') {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.$executeRaw`
            UPDATE products
            SET stock = GREATEST(0, stock - ${item.quantity}),
                reserved = GREATEST(0, reserved - ${item.quantity})
            WHERE id = ${item.productId} AND company_id = ${companyId}`;
          await adjustVariantStock(
            tx,
            item.productId,
            item.variant,
            item.quantity,
            'commit',
          );
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

  /** Rechaza el pago, cancela el pedido pendiente y libera su stock reservado. */
  async rejectPayment(
    companyId: string,
    id: string,
    userId: string,
    comment?: string,
  ) {
    const order = await this.get(companyId, id);
    if (order.status === 'cancelled' && order.paymentStatus === 'rejected') {
      return order;
    }
    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Solo se puede rechazar el pago de un pedido pendiente.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findFirst({
        where: { id: order.id, companyId },
        include: { items: true },
      });
      if (!current) throw new NotFoundException('Pedido no encontrado.');
      if (current.status !== 'pending') {
        throw new BadRequestException(
          'El pedido ya fue procesado y no se puede rechazar.',
        );
      }

      for (const item of current.items) {
        if (!item.productId) continue;
        await tx.$executeRaw`
          UPDATE products
          SET reserved = GREATEST(0, reserved - ${item.quantity})
          WHERE id = ${item.productId} AND company_id = ${companyId}`;
        await adjustVariantStock(
          tx,
          item.productId,
          item.variant,
          item.quantity,
          'release',
        );
      }

      const now = new Date();
      await tx.payment.update({
        where: { orderId: current.id },
        data: {
          status: 'rejected',
          rejectionComment: comment?.trim() || null,
          validatedAt: now,
          validatedByUserId: userId,
        },
      });
      await tx.order.update({
        where: { id: current.id },
        data: {
          status: 'cancelled',
          paymentStatus: 'rejected',
          reservationExpiresAt: null,
          cancelledAt: now,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: current.id,
          fromStatus: 'pending',
          toStatus: 'cancelled',
          changedByUserId: userId,
          comment: comment?.trim() || 'Pago rechazado',
        },
      });
    });

    if (order.payment?.proofUrl) {
      const proofUrl = order.payment.proofUrl;
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { proofUrl: null },
      });
      void this.media.deleteByUrl(proofUrl, companyId);
    }
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
    let allowed = [...(TRANSITIONS[order.status] ?? [])];
    if (order.status === 'confirmed') {
      // Los flujos cortos reemplazan al flujo antiguo; no mantienen "preparando".
      if (
        isServiceLikeBusiness(order.businessType) ||
        order.deliveryMethod === 'pickup'
      ) {
        allowed = ['delivered', 'cancelled'];
      } else if (order.deliveryMethod === 'delivery') {
        allowed = ['out_for_delivery', 'cancelled'];
      }
    }
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
            await adjustVariantStock(
              tx,
              item.productId,
              item.variant,
              item.quantity,
              'release',
            );
          } else {
            // Ya estaba confirmado (stock comprometido): devolverlo.
            await tx.$executeRaw`
              UPDATE products SET stock = stock + ${item.quantity}
              WHERE id = ${item.productId} AND company_id = ${companyId}`;
            await adjustVariantStock(
              tx,
              item.productId,
              item.variant,
              item.quantity,
              'restore',
            );
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
      void this.media.deleteByUrl(proofUrl, companyId);
    }

    return this.get(companyId, id);
  }
}
