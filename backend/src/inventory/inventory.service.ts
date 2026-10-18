import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderExpirationService } from '../orders/order-expiration.service';
import type { StockMovementType } from '../../generated/prisma/enums';
import { variantLabel } from '../orders/variant-stock.util';
import { PRODUCT_TYPES } from '../products/product-types';

type VariantRow = {
  size: string | null;
  color: string | null;
  stock: number;
  reserved: number;
};

const sameText = (a?: string | null, b?: string | null) =>
  (a ?? '').trim().toLocaleLowerCase() === (b ?? '').trim().toLocaleLowerCase();

/** Lista de opciones sin repetir (sin importar mayúsculas), en el orden dado. */
function uniqueOptions(values: Array<string | null | undefined>) {
  const out: string[] = [];
  for (const value of values) {
    const text = value?.trim();
    if (text && !out.some((item) => sameText(item, text))) out.push(text);
  }
  return out;
}

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
        productType: true,
        variantStocks: true,
        category: { select: { name: true } },
        imageUrl: true,
      },
    });
    // Lo separado viene de pedidos pagados que la tienda aún no confirma.
    const holds = await this.unpaidReservations(companyId);
    const byProduct = new Map<string, number>();
    for (const hold of holds) {
      for (const item of hold.items) {
        if (!item.productId) continue;
        byProduct.set(
          item.productId,
          (byProduct.get(item.productId) ?? 0) + item.quantity,
        );
      }
    }

    // Cuadre: lo "separado" de cada producto debe coincidir con los pedidos
    // que de verdad lo apartan. Si no (datos viejos o de prueba), se corrige.
    for (const row of rows) {
      const expected = byProduct.get(row.id) ?? 0;
      if (row.reserved === expected) continue;
      await this.prisma.product.update({
        where: { id: row.id },
        data: {
          reserved: expected,
          ...(expected === 0 ? await this.clearVariantReserved(row.id) : {}),
        },
      });
      row.reserved = expected;
    }
    // Vendido por canal (las anulaciones y cancelaciones restan).
    const soldRows = await this.prisma.$queryRaw<
      Array<{ productId: string; online: unknown; credit: unknown }>
    >`
      SELECT product_id AS productId,
        SUM(CASE
          WHEN (type = 'sale' AND reason LIKE 'Venta al cr%')
            OR (type = 'return' AND reason LIKE 'Anulaci%n cr%') THEN -quantity
          ELSE 0 END) AS credit,
        SUM(CASE
          WHEN (type = 'sale' AND (reason IS NULL OR reason NOT LIKE 'Venta al cr%'))
            OR type = 'cancellation' THEN -quantity
          ELSE 0 END) AS online
      FROM stock_movements
      WHERE company_id = ${companyId}
      GROUP BY product_id`;
    const sold = new Map(
      soldRows.map((row) => [
        row.productId,
        {
          online: Math.max(0, Number(row.online ?? 0)),
          credit: Math.max(0, Number(row.credit ?? 0)),
        },
      ]),
    );

    return rows.map(({ variantStocks, category, ...p }) => ({
      ...p,
      categoryName: category?.name ?? null,
      // Cuánto queda por talla/color (vacío si el producto no tiene opciones).
      variants: (Array.isArray(variantStocks)
        ? (variantStocks as VariantRow[])
        : []
      ).map((v) => ({
        size: v.size ?? null,
        color: v.color ?? null,
        stock: Number(v.stock ?? 0),
        reserved: Number(v.reserved ?? 0),
      })),
      available: p.stock - p.reserved,
      soldOnline: sold.get(p.id)?.online ?? 0,
      soldCredit: sold.get(p.id)?.credit ?? 0,
      // Lo que la dueña registró en total = lo que queda + lo vendido.
      registered:
        p.stock + (sold.get(p.id)?.online ?? 0) + (sold.get(p.id)?.credit ?? 0),
      toConfirm: byProduct.get(p.id) ?? 0,
    }));
  }

  /** Si ya no hay nada separado, las tallas tampoco deben tener separado. */
  private async clearVariantReserved(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { variantStocks: true },
    });
    const rows = Array.isArray(product?.variantStocks)
      ? (product.variantStocks as Array<Record<string, unknown>>)
      : [];
    if (!rows.some((row) => Number(row.reserved ?? 0) > 0)) return {};
    return { variantStocks: rows.map((row) => ({ ...row, reserved: 0 })) };
  }

  /**
   * Pedidos pagados (comprobante enviado) que apartan stock hasta que la
   * tienda los confirme o rechace en Pedidos.
   */
  async unpaidReservations(companyId: string) {
    const orders = await this.prisma.order.findMany({
      // Lo que aparta stock: pedidos con comprobante enviado, esperando que
      // la tienda confirme el pago (los que aún no pagan no apartan nada).
      where: {
        companyId,
        status: 'pending',
        stockReserved: true,
      },
      orderBy: { createdAt: 'asc' },
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
      expiresAt: order.reservationExpiresAt,
      items: order.items,
    }));
  }

  /** Historial paginado de movimientos. */
  async movements(
    companyId: string,
    opts: {
      productId?: string;
      page?: number;
      limit?: number;
      channel?: string;
    },
  ) {
    const page = Number.isFinite(opts.page)
      ? Math.max(1, Math.floor(opts.page!))
      : 1;
    const limit = Number.isFinite(opts.limit)
      ? Math.min(100, Math.max(1, Math.floor(opts.limit!)))
      : 30;
    // Canal: tienda virtual, crédito o ajustes hechos a mano.
    const CREDIT = [
      { reason: { startsWith: 'Venta al crédito' } },
      { reason: { startsWith: 'Anulación crédito' } },
    ];
    const STORE = [
      { type: 'sale' as const, reason: { startsWith: 'Venta pedido' } },
      { type: 'cancellation' as const },
    ];
    const byChannel =
      opts.channel === 'credito'
        ? { OR: CREDIT }
        : opts.channel === 'tienda'
          ? { OR: STORE }
          : opts.channel === 'ajuste'
            ? { NOT: [...CREDIT, ...STORE] }
            : {};
    const where = {
      companyId,
      ...(opts.productId ? { productId: opts.productId } : {}),
      ...byChannel,
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
    // Cliente de cada venta: del texto nuevo ("… · Nombre") o, en los
    // movimientos antiguos, buscando el pedido o la venta por su código.
    const codeOf = (reason: string | null) =>
      reason?.match(/\b(MT|CR)-[A-Z0-9]+\b/)?.[0] ?? null;
    const codes = items
      .map((m) => codeOf(m.reason))
      .filter(Boolean) as string[];
    const [orders, creditSales] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          companyId,
          publicCode: { in: codes.filter((c) => c.startsWith('MT-')) },
        },
        select: { publicCode: true, customerName: true },
      }),
      this.prisma.creditSale.findMany({
        where: {
          companyId,
          code: { in: codes.filter((c) => c.startsWith('CR-')) },
        },
        select: {
          code: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);
    const customerByCode = new Map<string, string>([
      ...orders.map((o) => [o.publicCode, o.customerName] as [string, string]),
      ...creditSales.map(
        (s) =>
          [s.code, `${s.customer.firstName} ${s.customer.lastName}`] as [
            string,
            string,
          ],
      ),
    ]);

    return {
      items: items.map((m) => {
        const code = codeOf(m.reason);
        const channel = code?.startsWith('CR-')
          ? 'credito'
          : code?.startsWith('MT-') || m.type === 'cancellation'
            ? 'tienda'
            : 'ajuste';
        return {
          id: m.id,
          productName: m.product.name,
          type: m.type,
          quantity: m.quantity,
          reason: m.reason,
          createdAt: m.createdAt,
          channel,
          code,
          customerName: code ? (customerByCode.get(code) ?? null) : null,
        };
      }),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Una devolución no puede superar lo vendido del producto (tienda + crédito,
   * menos lo ya devuelto a mano). Evita sumar stock que nunca salió.
   */
  private async assertReturnable(
    companyId: string,
    productId: string,
    quantity: number,
  ) {
    const [row] = await this.prisma.$queryRaw<
      Array<{ sold: unknown; returned: unknown }>
    >`
      SELECT
        SUM(CASE
          WHEN type IN ('sale', 'cancellation') THEN -quantity
          WHEN type = 'return' AND reason LIKE 'Anulaci%n cr%' THEN -quantity
          ELSE 0 END) AS sold,
        SUM(CASE
          WHEN type = 'return' AND (reason IS NULL OR reason NOT LIKE 'Anulaci%n cr%') THEN quantity
          ELSE 0 END) AS returned
      FROM stock_movements
      WHERE company_id = ${companyId} AND product_id = ${productId}`;
    const allowed = Math.max(
      0,
      Number(row?.sold ?? 0) - Number(row?.returned ?? 0),
    );
    if (quantity > allowed) {
      throw new BadRequestException(
        allowed === 0
          ? 'Este producto no tiene ventas que se puedan devolver.'
          : `Solo se pueden devolver ${allowed} ${allowed === 1 ? 'unidad' : 'unidades'} de este producto (lo vendido menos lo ya devuelto).`,
      );
    }
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

    if (dto.type === 'return') {
      await this.assertReturnable(companyId, product.id, delta);
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
   * Mercadería por talla/color: suma lo que llegó (o corrige el conteo) de cada
   * opción y puede agregar tallas o colores nuevos. Nada se reemplaza: las
   * opciones que no vienen quedan igual. Queda un movimiento en el historial.
   */
  async adjustVariants(
    companyId: string,
    userId: string,
    dto: {
      productId: string;
      type: 'entry' | 'return' | 'adjustment';
      reason?: string;
      rows: Array<{ size?: string; color?: string; quantity: number }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: dto.productId, companyId, deletedAt: null },
      });
      if (!product) throw new NotFoundException('Producto no encontrado.');
      const current = Array.isArray(product.variantStocks)
        ? (product.variantStocks as VariantRow[])
        : [];
      if (!current.length) {
        throw new BadRequestException(
          'Este producto no tiene tallas ni colores.',
        );
      }
      const usesSizes = current.some((row) => row.size);
      const usesColors = current.some((row) => row.color);
      const next: VariantRow[] = current.map((row) => ({
        size: row.size ?? null,
        color: row.color ?? null,
        stock: Number(row.stock ?? 0),
        reserved: Number(row.reserved ?? 0),
      }));

      const seen = new Set<string>();
      const changes: string[] = [];
      let delta = 0;
      let added = 0;
      for (const row of dto.rows) {
        const size = row.size?.trim() || null;
        const color = row.color?.trim() || null;
        if (Boolean(size) !== usesSizes || Boolean(color) !== usesColors) {
          throw new BadRequestException(
            usesSizes && usesColors
              ? 'Cada cantidad debe tener talla y color.'
              : usesSizes
                ? 'Cada cantidad debe tener su talla.'
                : 'Cada cantidad debe tener su color.',
          );
        }
        for (const text of [size, color]) {
          if (text && (text.length > 30 || text.includes(','))) {
            throw new BadRequestException(
              `"${text}" no es una talla o color válido.`,
            );
          }
        }
        const key = `${size ?? ''}\u0000${color ?? ''}`.toLocaleLowerCase();
        if (seen.has(key)) {
          throw new BadRequestException('Hay tallas o colores repetidos.');
        }
        seen.add(key);

        let target = next.find(
          (item) => sameText(item.size, size) && sameText(item.color, color),
        );
        if (!target) {
          // Si la talla o el color ya existen, se escriben igual que antes ("s" → "S").
          target = {
            size: next.find((item) => sameText(item.size, size))?.size ?? size,
            color:
              next.find((item) => sameText(item.color, color))?.color ?? color,
            stock: 0,
            reserved: 0,
          };
          next.push(target);
          added++;
        }
        const label = variantLabel(target.size, target.color) ?? '';
        let change: number;
        if (dto.type === 'adjustment') {
          if (row.quantity < target.reserved) {
            throw new BadRequestException(
              `${label}: no puedes dejar menos de ${target.reserved}; hay unidades por confirmar.`,
            );
          }
          change = row.quantity - target.stock;
        } else {
          change = row.quantity;
        }
        target.stock += change;
        delta += change;
        if (change !== 0)
          changes.push(`${label} ${change > 0 ? '+' : ''}${change}`);
      }

      if (dto.type === 'return') {
        await this.assertReturnable(companyId, product.id, delta);
      }
      if (dto.type !== 'adjustment' && delta <= 0) {
        throw new BadRequestException(
          dto.type === 'return'
            ? 'Escribe cuántas unidades volvieron.'
            : 'Escribe cuántas unidades llegaron.',
        );
      }
      // Una devolución es de algo que ya existía: no crea tallas ni colores nuevos.
      if (dto.type === 'return' && added) {
        throw new BadRequestException(
          'Una devolución solo puede ser de tallas o colores que ya tiene el producto.',
        );
      }
      if (dto.type === 'adjustment' && !changes.length && !added) {
        throw new BadRequestException('No cambiaste ninguna cantidad.');
      }

      // Con tallas y colores, cada talla tiene todos los colores (y al revés).
      const sizes = uniqueOptions([
        ...(product.sizes ?? '').split(','),
        ...next.map((row) => row.size),
      ]);
      const colors = uniqueOptions([
        ...(product.colors ?? '').split(','),
        ...next.map((row) => row.color),
      ]);
      if (usesSizes && usesColors) {
        for (const size of sizes) {
          for (const color of colors) {
            if (
              !next.some(
                (row) => sameText(row.size, size) && sameText(row.color, color),
              )
            ) {
              next.push({ size, color, stock: 0, reserved: 0 });
            }
          }
        }
      }

      const stock = next.reduce((sum, row) => sum + row.stock, 0);
      await tx.product.update({
        where: { id: product.id },
        data: {
          variantStocks: next,
          stock,
          ...(usesSizes ? { sizes: sizes.join(', ') } : {}),
          ...(usesColors ? { colors: colors.join(', ') } : {}),
        },
      });
      const note = dto.reason?.trim();
      const detail = changes.join(' · ');
      const reason = [note, detail].filter(Boolean).join(' — ') || null;
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: product.id,
            type: dto.type,
            quantity: delta,
            reason:
              reason && reason.length > 190
                ? `${reason.slice(0, 187)}...`
                : reason,
            createdByUserId: userId,
          },
        });
      }
      return { ok: true, stock, added };
    });
  }

  /**
   * Pedidos pagados por confirmar que incluyen el producto. Mientras existan,
   * no se le pueden poner tallas: se hicieron sin talla y no sabrían de cuál descontar.
   */
  async pendingOrderCodes(companyId: string, productId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        status: 'pending',
        stockReserved: true,
        items: { some: { productId } },
      },
      select: { publicCode: true },
      take: 5,
    });
    return orders.map((order) => order.publicCode);
  }

  /**
   * Completa el tipo de un producto que aún no tenía tallas ni colores: se
   * marcan las opciones y cuántas hay de cada una (lo que ya había + lo que
   * llegó). Es el mismo producto: conserva ventas, historial, fotos y precio.
   */
  async splitVariants(
    companyId: string,
    userId: string,
    dto: {
      productId: string;
      productType: string;
      reason?: string;
      rows: Array<{ size?: string; color?: string; quantity: number }>;
    },
  ) {
    if (!(PRODUCT_TYPES as readonly string[]).includes(dto.productType)) {
      throw new BadRequestException('Tipo de producto inválido.');
    }
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    if (Array.isArray(product.variantStocks) && product.variantStocks.length) {
      throw new BadRequestException(
        'Este producto ya tiene tallas o colores. Usa "Agregar lo que llegó".',
      );
    }
    const codes = await this.pendingOrderCodes(companyId, product.id);
    if (codes.length) {
      throw new BadRequestException(
        `Primero confirma o rechaza en Pedidos ${codes.length === 1 ? 'el pedido' : 'los pedidos'} ${codes.join(', ')}: se ${codes.length === 1 ? 'hizo' : 'hicieron'} sin talla.`,
      );
    }

    const usesSizes = dto.rows.some((row) => row.size?.trim());
    const usesColors = dto.rows.some((row) => row.color?.trim());
    const rows: VariantRow[] = [];
    for (const row of dto.rows) {
      const size = row.size?.trim() || null;
      const color = row.color?.trim() || null;
      if (Boolean(size) !== usesSizes || Boolean(color) !== usesColors) {
        throw new BadRequestException(
          usesSizes && usesColors
            ? 'Cada cantidad debe tener talla y color.'
            : usesSizes
              ? 'Cada cantidad debe tener su talla.'
              : 'Cada cantidad debe tener su color.',
        );
      }
      for (const text of [size, color]) {
        if (text && (text.length > 30 || text.includes(','))) {
          throw new BadRequestException(
            `"${text}" no es una talla o color válido.`,
          );
        }
      }
      if (
        rows.some(
          (item) => sameText(item.size, size) && sameText(item.color, color),
        )
      ) {
        throw new BadRequestException('Hay tallas o colores repetidos.');
      }
      rows.push({ size, color, stock: row.quantity, reserved: 0 });
    }

    // Con tallas y colores, cada talla tiene todos los colores.
    const sizes = uniqueOptions(rows.map((row) => row.size));
    const colors = uniqueOptions(rows.map((row) => row.color));
    if (usesSizes && usesColors) {
      for (const size of sizes) {
        for (const color of colors) {
          if (
            !rows.some(
              (row) => sameText(row.size, size) && sameText(row.color, color),
            )
          ) {
            rows.push({ size, color, stock: 0, reserved: 0 });
          }
        }
      }
    }

    const stock = rows.reduce((sum, row) => sum + row.stock, 0);
    const delta = stock - product.stock;
    const detail = rows
      .filter((row) => row.stock > 0)
      .map((row) => `${variantLabel(row.size, row.color)}: ${row.stock}`)
      .join(' · ');
    const note = dto.reason?.trim();
    const reason = [
      note,
      `Repartido por ${usesSizes ? 'tallas' : 'colores'}`,
      detail,
    ]
      .filter(Boolean)
      .join(' — ');

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: product.id },
        data: {
          productType: dto.productType,
          sizes: usesSizes ? sizes.join(', ') : null,
          colors: usesColors ? colors.join(', ') : null,
          variantStocks: rows,
          stock,
        },
      }),
      this.prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          // Si llegó más, es una entrada; si quedó igual o menos, una corrección.
          type: delta > 0 ? 'entry' : 'adjustment',
          quantity: delta,
          reason: reason.length > 190 ? `${reason.slice(0, 187)}...` : reason,
          createdByUserId: userId,
        },
      }),
    ]);
    return { ok: true, stock, before: product.stock, delta };
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
