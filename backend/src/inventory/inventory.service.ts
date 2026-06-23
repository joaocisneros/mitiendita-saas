import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { StockMovementType } from '../../generated/prisma/enums';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Productos con su stock para la vista de inventario. */
  async products(companyId: string) {
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
    return rows.map((p) => ({ ...p, available: p.stock - p.reserved }));
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
          type: dto.type as StockMovementType,
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
