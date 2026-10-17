import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderExpirationService } from '../orders/order-expiration.service';
import type { StockMovementType } from '../../generated/prisma/enums';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expiration: OrderExpirationService,
  ) {}

  /** Productos con su stock para la vista de inventario. */
  async products(companyId: string) {
    // Lo "separado" que ve la dueña ya no incluye reservas vencidas.
    await this.expiration
      .expireStaleReservations(companyId)
      .catch(() => undefined);
    const rows = await this.prisma.product.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        reserved: true,
        isActive: true,
      },
    });
    // Parte de lo separado que es solo una reserva sin pagar (vuelve sola).
    const holds = await this.unpaidReservations(companyId);
    const byProduct = new Map<string, { quantity: number; until: Date }>();
    for (const hold of holds) {
      for (const item of hold.items) {
        if (!item.productId) continue;
        const prev = byProduct.get(item.productId);
        byProduct.set(item.productId, {
          quantity: (prev?.quantity ?? 0) + item.quantity,
          until:
            prev && prev.until > hold.expiresAt ? prev.until : hold.expiresAt,
        });
      }
    }
    return rows.map((p) => ({
      ...p,
      available: p.stock - p.reserved,
      unpaidReserved: byProduct.get(p.id)?.quantity ?? 0,
      unpaidUntil: byProduct.get(p.id)?.until ?? null,
    }));
  }

  /**
   * Pedidos que apartan stock sin haber pagado (sin comprobante): la dueña
   * los ve para entender lo "separado" y puede liberarlos antes de tiempo.
   */
  async unpaidReservations(companyId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        status: 'pending',
        paymentStatus: 'pending',
        reservationExpiresAt: { not: null },
      },
      orderBy: { reservationExpiresAt: 'asc' },
      take: 50,
      select: {
        id: true,
        publicCode: true,
        customerName: true,
        total: true,
        createdAt: true,
        reservationExpiresAt: true,
        items: {
          select: {
            productId: true,
            name: true,
            variant: true,
            quantity: true,
          },
        },
      },
    });
    return orders.map((order) => ({
      id: order.id,
      code: order.publicCode,
      customerName: order.customerName,
      total: order.total.toString(),
      createdAt: order.createdAt,
      expiresAt: order.reservationExpiresAt!,
      items: order.items,
    }));
  }

  /** La dueña libera ya una reserva sin pagar (el pedido queda cancelado). */
  async releaseReservation(companyId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, companyId },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (order.status !== 'pending' || order.paymentStatus !== 'pending') {
      throw new BadRequestException(
        'Este pedido ya no es una reserva sin pagar.',
      );
    }
    await this.prisma.$transaction((tx) =>
      this.expiration.releaseReservation(
        tx,
        order.id,
        'cancelled',
        'Reserva liberada por la tienda (sin pago)',
      ),
    );
    return { ok: true };
  }

  /** Historial paginado de movimientos. */
  async movements(
    companyId: string,
    opts: { productId?: string; page?: number; limit?: number },
  ) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 30;
    const where = {
      companyId,
      ...(opts.productId ? { productId: opts.productId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { product: { select: { name: true } } },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      items: items.map((m) => ({
        id: m.id,
        productName: m.product.name,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        createdAt: m.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /** Ajuste manual de stock que queda registrado en el historial. */
  async adjust(
    companyId: string,
    userId: string,
    dto: { productId: string; type: string; quantity: number; reason?: string },
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    if (
      Array.isArray(product.variantStocks) &&
      product.variantStocks.length > 0
    ) {
      throw new BadRequestException(
        'Este producto tiene cantidades por talla o color. Cámbialas desde Productos > Editar.',
      );
    }

    // entry/return suman; adjustment fija el stock al valor indicado.
    let delta: number;
    let newStock: number;
    if (dto.type === 'adjustment') {
      newStock = dto.quantity;
      delta = newStock - product.stock;
    } else if (dto.type === 'entry' || dto.type === 'return') {
      if (dto.quantity <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero.');
      }
      delta = dto.quantity;
      newStock = product.stock + delta;
    } else {
      throw new BadRequestException('Tipo de movimiento inválido.');
    }

    if (newStock < product.reserved) {
      throw new BadRequestException(
        `No puedes dejar el stock por debajo de lo reservado (${product.reserved}).`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          type: dto.type,
          quantity: delta,
          reason: dto.reason ?? null,
          createdByUserId: userId,
        },
      }),
    ]);

    return { ok: true, stock: newStock };
  }

  /**
   * Registra un movimiento automático (venta/cancelación) dentro de una
   * transacción existente. Lo usan los pedidos al confirmar/cancelar.
   */
  static movementData(
    companyId: string,
    productId: string,
    type: StockMovementType,
    quantity: number,
    reason: string,
  ) {
    return { companyId, productId, type, quantity, reason };
  }
}
