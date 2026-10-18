import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { normalizePhone } from '../common/utils/phone.util';
import {
  toAddress,
  toCatalogName,
  toSentence,
  toTitleCase,
} from '../common/utils/text.util';
import { generateCreditCode } from '../common/utils/order-code.util';
import { adjustVariantStock, variantLabel } from '../orders/variant-stock.util';
import {
  CreateCreditCustomerDto,
  UpdateCreditCustomerDto,
} from './dto/credit-customer.dto';
import {
  CancelCreditSaleDto,
  CreateCreditSaleDto,
} from './dto/credit-sale.dto';
import {
  CreateCreditPaymentDto,
  UpdateCreditPaymentDto,
} from './dto/credit-payment.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Foto del producto para mostrar en las ventas al crédito. */
const ITEM_PRODUCT = {
  product: { select: { imageUrl: true, images: true } },
} as const;
const money = (n: number) => round2(n).toFixed(2);

type Tx = Prisma.TransactionClient;

/**
 * Ventas al crédito: la clienta se lleva productos y los va pagando con abonos.
 * El saldo es (ventas no anuladas − abonos). Los abonos se aplican a las
 * ventas más antiguas primero, y así cada venta sabe si ya quedó pagada.
 */
@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────── RESUMEN ─────────────────────

  async summary(companyId: string) {
    const monthStart = startOfMonthLima();
    const [pending, collected, withDebt, customers] = await Promise.all([
      this.prisma.creditSale.aggregate({
        where: { companyId, status: 'pending' },
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.creditPayment.aggregate({
        where: { companyId, paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.creditCustomer.count({
        where: {
          companyId,
          isActive: true,
          sales: { some: { status: 'pending' } },
        },
      }),
      this.prisma.creditCustomer.count({
        where: { companyId, isActive: true },
      }),
    ]);
    return {
      receivable: money(
        Number(pending._sum.total ?? 0) - Number(pending._sum.paidAmount ?? 0),
      ),
      collectedThisMonth: money(Number(collected._sum.amount ?? 0)),
      customersWithDebt: withDebt,
      customers,
    };
  }

  /**
   * Reporte de ventas al crédito en un rango: lo entregado, lo cobrado,
   * cómo va la cobranza, quiénes deben más y qué productos salen al crédito.
   */
  async report(companyId: string, from: Date, to: Date) {
    const range = { gte: from, lte: to };
    const [sales, payments, pending, topItems, overview, payers] =
      await Promise.all([
        this.prisma.creditSale.findMany({
          where: { companyId, status: { not: 'cancelled' }, soldAt: range },
          select: { total: true, soldAt: true },
        }),
        this.prisma.creditPayment.findMany({
          where: { companyId, paidAt: range },
          select: { amount: true, paidAt: true },
        }),
        // Saldos pendientes de hoy (no dependen del rango).
        this.prisma.creditSale.findMany({
          where: { companyId, status: 'pending' },
          select: {
            total: true,
            paidAmount: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        }),
        this.prisma.creditSaleItem.groupBy({
          by: ['name'],
          where: {
            sale: { companyId, status: { not: 'cancelled' }, soldAt: range },
          },
          _sum: { quantity: true, lineTotal: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.summary(companyId),
        // Quién pagó más en el periodo (la "mejor clienta" de créditos).
        this.prisma.creditPayment.groupBy({
          by: ['creditCustomerId'],
          where: { companyId, paidAt: range },
          _sum: { amount: true },
          _count: { _all: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 5,
        }),
      ]);
    // Quién compró más al crédito en el periodo (monto y productos).
    const boughtItems = await this.prisma.creditSaleItem.findMany({
      where: {
        sale: { companyId, status: { not: 'cancelled' }, soldAt: range },
      },
      select: {
        quantity: true,
        lineTotal: true,
        sale: { select: { creditCustomerId: true } },
      },
    });
    const buyers = new Map<string, { total: number; units: number }>();
    for (const item of boughtItems) {
      const id = item.sale.creditCustomerId;
      const row = buyers.get(id) ?? { total: 0, units: 0 };
      row.total += Number(item.lineTotal);
      row.units += item.quantity;
      buyers.set(id, row);
    }
    const topBuyerIds = [...buyers.entries()]
      .sort(([, a], [, b]) => b.total - a.total || b.units - a.units)
      .slice(0, 5)
      .map(([id]) => id);

    const payerNames = await this.prisma.creditCustomer.findMany({
      where: {
        id: {
          in: [...payers.map((p) => p.creditCustomerId), ...topBuyerIds],
        },
      },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    const nameOf = new Map(payerNames.map((c) => [c.id, c]));

    const day = (date: Date) => date.toISOString().slice(0, 10);
    const byDay = new Map<string, { sold: number; collected: number }>();
    for (const sale of sales) {
      const row = byDay.get(day(sale.soldAt)) ?? { sold: 0, collected: 0 };
      row.sold += Number(sale.total);
      byDay.set(day(sale.soldAt), row);
    }
    for (const payment of payments) {
      const row = byDay.get(day(payment.paidAt)) ?? { sold: 0, collected: 0 };
      row.collected += Number(payment.amount);
      byDay.set(day(payment.paidAt), row);
    }

    const debtors = new Map<
      string,
      { name: string; phone: string; balance: number }
    >();
    for (const sale of pending) {
      const c = sale.customer;
      const row = debtors.get(c.id) ?? {
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone,
        balance: 0,
      };
      row.balance += Number(sale.total) - Number(sale.paidAmount);
      debtors.set(c.id, row);
    }

    return {
      soldTotal: money(sales.reduce((sum, s) => sum + Number(s.total), 0)),
      salesCount: sales.length,
      collected: money(payments.reduce((sum, p) => sum + Number(p.amount), 0)),
      paymentsCount: payments.length,
      receivable: overview.receivable,
      customersWithDebt: overview.customersWithDebt,
      customers: overview.customers,
      byDay: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          sold: money(v.sold),
          collected: money(v.collected),
        })),
      topDebtors: [...debtors.values()]
        .filter((d) => d.balance > 0.001)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5)
        .map((d) => ({ ...d, balance: money(d.balance) })),
      topBuyers: topBuyerIds.map((id) => {
        const c = nameOf.get(id);
        const bought = buyers.get(id)!;
        return {
          name: c ? `${c.firstName} ${c.lastName}` : 'Clienta',
          phone: c?.phone ?? '',
          bought: money(bought.total),
          units: bought.units,
          // Saldo actual: sirve para no premiar a quien se lleva mucho y no paga.
          balance: money(
            pending
              .filter((sale) => sale.customer.id === id)
              .reduce(
                (sum, sale) =>
                  sum + Number(sale.total) - Number(sale.paidAmount),
                0,
              ),
          ),
        };
      }),
      topPayers: payers.map((p) => {
        const c = nameOf.get(p.creditCustomerId);
        return {
          name: c ? `${c.firstName} ${c.lastName}` : 'Clienta',
          phone: c?.phone ?? '',
          payments: p._count._all,
          paid: money(Number(p._sum.amount ?? 0)),
        };
      }),
      topProducts: topItems.map((item) => ({
        name: item.name,
        units: item._sum.quantity ?? 0,
        total: money(Number(item._sum.lineTotal ?? 0)),
      })),
    };
  }

  // ───────────────────── CLIENTAS ─────────────────────

  async listCustomers(
    companyId: string,
    opts: { search?: string; status?: string; page?: number; limit?: number },
  ) {
    const page = Number.isFinite(opts.page)
      ? Math.max(1, Math.floor(opts.page!))
      : 1;
    const limit = Number.isFinite(opts.limit)
      ? Math.min(100, Math.max(1, Math.floor(opts.limit!)))
      : 20;
    const search = opts.search?.trim();
    const where: Prisma.CreditCustomerWhereInput = {
      companyId,
      isActive: opts.status !== 'inactive',
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { phone: { contains: normalizePhone(search) || search } },
              { documentNumber: { contains: search } },
            ],
          }
        : {}),
      ...(opts.status === 'debt'
        ? { sales: { some: { status: 'pending' } } }
        : opts.status === 'clear'
          ? { sales: { none: { status: 'pending' } } }
          : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.creditCustomer.findMany({
        where,
        orderBy: [{ lastActivityAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditCustomer.count({ where }),
    ]);

    const ids = rows.map((row) => row.id);
    const [sales, payments] = await Promise.all([
      this.prisma.creditSale.groupBy({
        by: ['creditCustomerId'],
        where: { creditCustomerId: { in: ids }, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      this.prisma.creditPayment.groupBy({
        by: ['creditCustomerId'],
        where: { creditCustomerId: { in: ids } },
        _sum: { amount: true },
        _max: { paidAt: true },
      }),
    ]);
    const salesBy = new Map(
      sales.map((s) => [s.creditCustomerId, Number(s._sum.total ?? 0)]),
    );
    const paymentsBy = new Map(payments.map((p) => [p.creditCustomerId, p]));

    return {
      items: rows.map((row) => {
        const sold = salesBy.get(row.id) ?? 0;
        const payment = paymentsBy.get(row.id);
        const paid = Number(payment?._sum.amount ?? 0);
        return {
          ...this.formatCustomer(row),
          totalSold: money(sold),
          totalPaid: money(paid),
          balance: money(sold - paid),
          lastPaymentAt: payment?._max.paidAt ?? null,
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Elimina a una clienta registrada por error. Solo si no tiene ventas (ni
   * anuladas) ni abonos: con historial se desactiva para no perderlo.
   */
  async deleteCustomer(companyId: string, id: string) {
    const customer = await this.prisma.creditCustomer.findFirst({
      where: { id, companyId },
      select: { id: true, _count: { select: { sales: true, payments: true } } },
    });
    if (!customer) throw new NotFoundException('Clienta no encontrada.');
    if (customer._count.sales > 0 || customer._count.payments > 0) {
      throw new ConflictException(
        'Esta clienta tiene ventas o abonos registrados. Desactívala para ocultarla y conservar su historial.',
      );
    }
    await this.prisma.creditCustomer.delete({ where: { id } });
    return { ok: true };
  }

  async createCustomer(companyId: string, dto: CreateCreditCustomerDto) {
    const phone = this.validPhone(dto.phone);
    await this.assertPhoneFree(companyId, phone);
    const documentNumber = dto.documentNumber || null;
    if (documentNumber) await this.assertDniFree(companyId, documentNumber);
    const created = await this.prisma.creditCustomer
      .create({
        data: {
          companyId,
          documentNumber,
          firstName: toTitleCase(requiredText(dto.firstName, 'nombres')),
          lastName: toTitleCase(requiredText(dto.lastName, 'apellidos')),
          phone,
          address: toAddress(requiredText(dto.address, 'dirección')),
          reference: dto.reference?.trim()
            ? toCatalogName(dto.reference)
            : null,
          note: dto.note?.trim() ? toSentence(dto.note) : null,
          creditLimit: dto.creditLimit ?? null,
        },
      })
      .catch(duplicateCustomer);
    return this.formatCustomer(created);
  }

  async updateCustomer(
    companyId: string,
    id: string,
    dto: UpdateCreditCustomerDto,
  ) {
    const current = await this.findCustomer(companyId, id);
    const data: Prisma.CreditCustomerUpdateInput = {};
    if (dto.firstName !== undefined)
      data.firstName = toTitleCase(requiredText(dto.firstName, 'nombres'));
    if (dto.lastName !== undefined)
      data.lastName = toTitleCase(requiredText(dto.lastName, 'apellidos'));
    if (dto.address !== undefined)
      data.address = toAddress(requiredText(dto.address, 'dirección'));
    if (dto.reference !== undefined)
      data.reference = dto.reference.trim()
        ? toCatalogName(dto.reference)
        : null;
    if (dto.note !== undefined)
      data.note = dto.note.trim() ? toSentence(dto.note) : null;
    if (dto.creditLimit !== undefined) data.creditLimit = dto.creditLimit;
    if (
      dto.documentNumber !== undefined &&
      (dto.documentNumber || null) !== current.documentNumber
    ) {
      if (dto.documentNumber) {
        await this.assertDniFree(companyId, dto.documentNumber);
      }
      data.documentNumber = dto.documentNumber || null;
    }
    if (dto.phone !== undefined) {
      const phone = this.validPhone(dto.phone);
      if (phone !== current.phone) {
        await this.assertPhoneFree(companyId, phone);
        data.phone = phone;
      }
    }
    if (dto.isActive !== undefined) {
      if (!dto.isActive && (await this.balanceOf(this.prisma, id)) > 0) {
        throw new BadRequestException(
          'No puedes desactivar a una clienta que todavía tiene saldo pendiente.',
        );
      }
      data.isActive = dto.isActive;
    }
    const updated = await this.prisma.creditCustomer
      .update({ where: { id }, data })
      .catch(duplicateCustomer);
    return this.formatCustomer(updated);
  }

  /** Ficha completa: datos, saldo, ventas con sus productos y abonos. */
  async getCustomer(companyId: string, id: string) {
    const customer = await this.prisma.creditCustomer.findFirst({
      where: { id, companyId },
      include: {
        sales: {
          orderBy: [{ soldAt: 'desc' }, { createdAt: 'desc' }],
          include: { items: { include: ITEM_PRODUCT } },
        },
        payments: {
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
          include: { sale: { select: { code: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Clienta no encontrada.');

    const sold = customer.sales
      .filter((sale) => sale.status !== 'cancelled')
      .reduce((sum, sale) => sum + Number(sale.total), 0);
    const paid = customer.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const latestPayment = [...customer.payments].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];

    return {
      ...this.formatCustomer(customer),
      totalSold: money(sold),
      totalPaid: money(paid),
      balance: money(sold - paid),
      sales: customer.sales.map((sale) => this.formatSale(sale)),
      payments: customer.payments.map((payment) => ({
        id: payment.id,
        amount: money(Number(payment.amount)),
        method: payment.method,
        paidAt: payment.paidAt,
        note: payment.note,
        createdAt: payment.createdAt,
        creditSaleId: payment.creditSaleId,
        saleCode: payment.sale?.code ?? null,
        canDelete: payment.id === latestPayment?.id,
      })),
    };
  }

  // ───────────────────── VENTAS AL CRÉDITO ─────────────────────

  async createSale(
    companyId: string,
    userId: string,
    customerId: string,
    dto: CreateCreditSaleDto,
  ) {
    const sale = await this.prisma.$transaction(async (tx) => {
      const customer = await this.lockCustomer(tx, companyId, customerId);
      if (!customer.isActive) {
        throw new BadRequestException(
          'Esta clienta está desactivada. Actívala para entregarle productos.',
        );
      }

      const ids = [...new Set(dto.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: ids }, companyId, deletedAt: null },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const lines = dto.items.map((item) => {
        const product = byId.get(item.productId);
        if (!product) {
          throw new BadRequestException('Uno de los productos ya no existe.');
        }
        const unitPrice = round2(item.unitPrice ?? Number(product.price));
        return {
          productId: product.id,
          name: product.name,
          variant: variantLabel(item.size, item.color),
          sku: product.sku,
          unitPrice,
          quantity: item.quantity,
          lineTotal: round2(unitPrice * item.quantity),
        };
      });
      const total = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

      if (customer.creditLimit !== null) {
        const balance = await this.balanceOf(tx, customer.id);
        const limit = Number(customer.creditLimit);
        if (balance + total > limit + 0.001) {
          throw new BadRequestException(
            `Supera el límite de crédito de la clienta (S/ ${money(limit)}). Saldo actual: S/ ${money(balance)}.`,
          );
        }
      }

      let code = generateCreditCode();
      for (let i = 0; i < 5; i++) {
        if (!(await tx.creditSale.findUnique({ where: { code } }))) break;
        code = generateCreditCode();
      }

      // Salida directa de stock: el producto se entrega en el momento.
      for (const line of lines) {
        const affected = await tx.$executeRaw`
          UPDATE products
          SET stock = stock - ${line.quantity}
          WHERE id = ${line.productId}
            AND company_id = ${companyId}
            AND deleted_at IS NULL
            AND (stock - reserved) >= ${line.quantity}`;
        if (affected === 0) {
          throw new ConflictException(
            `Stock insuficiente para "${line.name}".`,
          );
        }
        await adjustVariantStock(
          tx,
          line.productId,
          line.variant,
          line.quantity,
          'sell',
        );
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: line.productId,
            type: 'sale',
            quantity: -line.quantity,
            reason: `Venta al crédito ${code} · ${customer.firstName} ${customer.lastName}`,
            createdByUserId: userId,
          },
        });
      }

      const created = await tx.creditSale.create({
        data: {
          companyId,
          creditCustomerId: customer.id,
          code,
          total,
          note: dto.note?.trim() || null,
          soldAt: dto.soldAt ? new Date(dto.soldAt) : new Date(),
          createdByUserId: userId,
          items: { create: lines },
        },
      });

      // Si la clienta tenía abonos a favor no aplicados, se reparten aquí.
      await this.reapplyPayments(tx, customer.id);
      await this.touch(tx, customer.id);
      return tx.creditSale.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: { include: ITEM_PRODUCT } },
      });
    });
    return this.formatSale(sale);
  }

  async cancelSale(
    companyId: string,
    userId: string,
    saleId: string,
    dto: CancelCreditSaleDto,
  ) {
    const sale = await this.prisma.creditSale.findFirst({
      where: { id: saleId, companyId },
      select: { creditCustomerId: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const customer = await this.lockCustomer(
        tx,
        companyId,
        sale.creditCustomerId,
      );
      const current = await tx.creditSale.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: { include: ITEM_PRODUCT } },
      });
      if (current.status === 'cancelled') {
        throw new BadRequestException('Esta venta ya está anulada.');
      }
      if (Number(current.paidAmount) > 0) {
        throw new BadRequestException(
          'No puedes anular una venta que ya tiene abonos aplicados.',
        );
      }

      // Devuelve el stock de cada producto entregado.
      for (const item of current.items) {
        if (!item.productId) continue;
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
            type: 'return',
            quantity: item.quantity,
            reason: `Anulación crédito ${current.code} · ${customer.firstName} ${customer.lastName}`,
            createdByUserId: userId,
          },
        });
      }

      await tx.creditSale.update({
        where: { id: saleId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: dto.reason?.trim() || null,
        },
      });
      await this.reapplyPayments(tx, current.creditCustomerId);
      await this.touch(tx, current.creditCustomerId);
      return tx.creditSale.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: { include: ITEM_PRODUCT } },
      });
    });
    return this.formatSale(updated);
  }

  // ───────────────────── ABONOS ─────────────────────

  async createPayment(
    companyId: string,
    userId: string,
    customerId: string,
    dto: CreateCreditPaymentDto,
  ) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const customer = await this.lockCustomer(tx, companyId, customerId);
      const balance = await this.balanceOf(tx, customer.id);
      const amount = round2(dto.amount);
      if (balance <= 0) {
        throw new BadRequestException('Esta clienta no tiene saldo pendiente.');
      }
      if (amount > balance + 0.001) {
        throw new BadRequestException(
          `El abono supera el saldo pendiente (S/ ${money(balance)}).`,
        );
      }
      if (dto.creditSaleId) {
        const sale = await tx.creditSale.findFirst({
          where: { id: dto.creditSaleId, creditCustomerId: customer.id },
          select: { code: true, status: true, total: true, paidAmount: true },
        });
        if (!sale) throw new NotFoundException('Venta no encontrada.');
        const pending = round2(Number(sale.total) - Number(sale.paidAmount));
        if (sale.status !== 'pending' || pending <= 0) {
          throw new BadRequestException(
            `La venta ${sale.code} ya no tiene saldo pendiente.`,
          );
        }
        if (amount > pending + 0.001) {
          throw new BadRequestException(
            `El abono supera lo que falta de la venta ${sale.code} (S/ ${money(pending)}).`,
          );
        }
      }
      const created = await tx.creditPayment.create({
        data: {
          companyId,
          creditCustomerId: customer.id,
          creditSaleId: dto.creditSaleId ?? null,
          amount,
          method: dto.method ?? 'cash',
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          note: dto.note?.trim() || null,
          createdByUserId: userId,
        },
      });
      await this.reapplyPayments(tx, customer.id);
      await this.touch(tx, customer.id);
      return { ...created, balance: balance - amount };
    });
    return {
      id: payment.id,
      amount: money(Number(payment.amount)),
      method: payment.method,
      paidAt: payment.paidAt,
      note: payment.note,
      balance: money(payment.balance),
    };
  }

  /**
   * Corrige el último abono (monto, medio, fecha o nota). Es lo mismo que
   * eliminarlo y volver a registrarlo, pero en un solo paso.
   */
  async updatePayment(
    companyId: string,
    paymentId: string,
    dto: UpdateCreditPaymentDto,
  ) {
    const payment = await this.prisma.creditPayment.findFirst({
      where: { id: paymentId, companyId },
      select: { creditCustomerId: true },
    });
    if (!payment) throw new NotFoundException('Abono no encontrado.');

    return this.prisma.$transaction(async (tx) => {
      await this.lockCustomer(tx, companyId, payment.creditCustomerId);
      const latest = await tx.creditPayment.findFirst({
        where: { creditCustomerId: payment.creditCustomerId },
        orderBy: { createdAt: 'desc' },
      });
      if (latest?.id !== paymentId) {
        throw new BadRequestException(
          'Solo puedes corregir el último abono registrado.',
        );
      }
      // Lo que debería sin este abono es el máximo que se puede corregir.
      const owed = round2(
        (await this.balanceOf(tx, payment.creditCustomerId)) +
          Number(latest.amount),
      );
      const amount = round2(dto.amount);
      if (amount > owed + 0.001) {
        throw new BadRequestException(
          `El abono supera el saldo pendiente (S/ ${money(owed)}).`,
        );
      }
      const updated = await tx.creditPayment.update({
        where: { id: paymentId },
        data: {
          amount,
          ...(dto.method ? { method: dto.method } : {}),
          ...(dto.paidAt ? { paidAt: new Date(dto.paidAt) } : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        },
      });
      await this.reapplyPayments(tx, payment.creditCustomerId);
      await this.touch(tx, payment.creditCustomerId);
      return {
        id: updated.id,
        amount: money(Number(updated.amount)),
        method: updated.method,
        paidAt: updated.paidAt,
        note: updated.note,
        balance: money(owed - amount),
      };
    });
  }

  /** Solo se puede borrar el último abono registrado (para corregir errores). */
  async deletePayment(companyId: string, paymentId: string) {
    const payment = await this.prisma.creditPayment.findFirst({
      where: { id: paymentId, companyId },
      select: { creditCustomerId: true },
    });
    if (!payment) throw new NotFoundException('Abono no encontrado.');

    await this.prisma.$transaction(async (tx) => {
      await this.lockCustomer(tx, companyId, payment.creditCustomerId);
      const latest = await tx.creditPayment.findFirst({
        where: { creditCustomerId: payment.creditCustomerId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latest?.id !== paymentId) {
        throw new BadRequestException(
          'Solo puedes eliminar el último abono registrado.',
        );
      }
      await tx.creditPayment.delete({ where: { id: paymentId } });
      await this.reapplyPayments(tx, payment.creditCustomerId);
      await this.touch(tx, payment.creditCustomerId);
    });
    return { ok: true };
  }

  // ───────────────────── HELPERS ─────────────────────

  /**
   * Bloquea la fila de la clienta durante la transacción: dos abonos o ventas
   * simultáneos se procesan uno tras otro y el saldo nunca queda negativo.
   */
  private async lockCustomer(tx: Tx, companyId: string, id: string) {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM credit_customers
      WHERE id = ${id} AND company_id = ${companyId}
      FOR UPDATE`;
    if (!locked.length) throw new NotFoundException('Clienta no encontrada.');
    return tx.creditCustomer.findUniqueOrThrow({ where: { id } });
  }

  private async balanceOf(client: Tx, customerId: string) {
    const [sales, payments] = await Promise.all([
      client.creditSale.aggregate({
        where: { creditCustomerId: customerId, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      client.creditPayment.aggregate({
        where: { creditCustomerId: customerId },
        _sum: { amount: true },
      }),
    ]);
    return round2(
      Number(sales._sum.total ?? 0) - Number(payments._sum.amount ?? 0),
    );
  }

  /**
   * Recalcula lo pagado de cada venta: primero los abonos hechos a esa venta,
   * después los abonos generales, de la venta más antigua a la más nueva.
   */
  private async reapplyPayments(tx: Tx, customerId: string) {
    const payments = await tx.creditPayment.findMany({
      where: { creditCustomerId: customerId },
      select: { amount: true, creditSaleId: true },
    });
    const direct = new Map<string, number>();
    let remaining = 0;
    for (const payment of payments) {
      const amount = Number(payment.amount);
      if (payment.creditSaleId) {
        direct.set(
          payment.creditSaleId,
          round2((direct.get(payment.creditSaleId) ?? 0) + amount),
        );
      } else {
        remaining = round2(remaining + amount);
      }
    }
    const sales = await tx.creditSale.findMany({
      where: { creditCustomerId: customerId, status: { not: 'cancelled' } },
      orderBy: [{ soldAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, total: true, paidAmount: true, status: true },
    });
    // Lo que un abono dirigido pague de más (o a una venta anulada) no se
    // pierde: pasa al reparto general.
    for (const [saleId, amount] of direct) {
      const sale = sales.find((item) => item.id === saleId);
      const usable = sale ? Math.min(Number(sale.total), amount) : 0;
      if (amount > usable) remaining = round2(remaining + amount - usable);
    }
    for (const sale of sales) {
      const total = Number(sale.total);
      const own = Math.min(total, direct.get(sale.id) ?? 0);
      const shared = round2(Math.min(total - own, remaining));
      remaining = round2(remaining - shared);
      const applied = round2(own + shared);
      const status = applied >= total ? 'paid' : 'pending';
      if (Number(sale.paidAmount) !== applied || sale.status !== status) {
        await tx.creditSale.update({
          where: { id: sale.id },
          data: { paidAmount: applied, status },
        });
      }
    }
  }

  /** Sube a la clienta en la lista ("última actividad"). */
  private async touch(tx: Tx, customerId: string) {
    await tx.creditCustomer.update({
      where: { id: customerId },
      data: { lastActivityAt: new Date() },
    });
  }

  private async findCustomer(companyId: string, id: string) {
    const customer = await this.prisma.creditCustomer.findFirst({
      where: { id, companyId },
    });
    if (!customer) throw new NotFoundException('Clienta no encontrada.');
    return customer;
  }

  private validPhone(raw: string) {
    const phone = normalizePhone(raw);
    if (phone.length < 6) {
      throw new BadRequestException('Ingresa un número de celular válido.');
    }
    return phone;
  }

  private async assertPhoneFree(companyId: string, phone: string) {
    const taken = await this.prisma.creditCustomer.findUnique({
      where: { companyId_phone: { companyId, phone } },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('Ya tienes una clienta con ese celular.');
    }
  }

  private async assertDniFree(companyId: string, documentNumber: string) {
    const taken = await this.prisma.creditCustomer.findUnique({
      where: { companyId_documentNumber: { companyId, documentNumber } },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('Ya tienes una clienta con ese DNI.');
    }
  }

  private formatCustomer(c: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    documentNumber: string | null;
    address: string;
    reference: string | null;
    note: string | null;
    creditLimit: unknown;
    isActive: boolean;
    lastActivityAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      documentNumber: c.documentNumber,
      address: c.address,
      reference: c.reference,
      note: c.note,
      creditLimit: c.creditLimit === null ? null : money(Number(c.creditLimit)),
      isActive: c.isActive,
      lastActivityAt: c.lastActivityAt,
      createdAt: c.createdAt,
    };
  }

  private formatSale(sale: {
    id: string;
    code: string;
    status: string;
    total: unknown;
    paidAmount: unknown;
    note: string | null;
    soldAt: Date;
    cancelledAt: Date | null;
    cancelReason: string | null;
    items: Array<{
      productId: string | null;
      name: string;
      variant: string | null;
      unitPrice: unknown;
      quantity: number;
      lineTotal: unknown;
      product?: { imageUrl: string | null; images: unknown } | null;
    }>;
  }) {
    const total = Number(sale.total);
    const paid = Number(sale.paidAmount);
    return {
      id: sale.id,
      code: sale.code,
      status: sale.status,
      total: money(total),
      paidAmount: money(paid),
      pending: money(sale.status === 'cancelled' ? 0 : total - paid),
      note: sale.note,
      soldAt: sale.soldAt,
      cancelledAt: sale.cancelledAt,
      cancelReason: sale.cancelReason,
      items: sale.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        variant: item.variant,
        unitPrice: money(Number(item.unitPrice)),
        quantity: item.quantity,
        lineTotal: money(Number(item.lineTotal)),
        imageUrl: productImage(item.product),
      })),
    };
  }
}

/** Inicio del mes actual en hora de Lima (UTC-5, sin horario de verano). */
function startOfMonthLima(): Date {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), 1, 5, 0, 0),
  );
}

/** Imagen principal del producto: imageUrl o la primera de la galería. */
function productImage(
  product?: { imageUrl: string | null; images: unknown } | null,
): string | null {
  if (!product) return null;
  if (product.imageUrl) return product.imageUrl;
  const images = Array.isArray(product.images) ? product.images : [];
  return typeof images[0] === 'string' ? images[0] : null;
}

/** Texto obligatorio sin contar espacios (evita guardar "   "). */
function requiredText(value: string, label: string): string {
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length < 2) {
    throw new BadRequestException(`Completa el campo ${label}.`);
  }
  return text;
}

/**
 * Si dos registros con el mismo celular o DNI llegan a la vez, la base de
 * datos rechaza el segundo: se responde con el mensaje claro, no con error 500.
 */
function duplicateCustomer(error: unknown): never {
  const known = error as { code?: string; meta?: unknown };
  if (known?.code === 'P2002') {
    const target = JSON.stringify(known.meta ?? {});
    throw new ConflictException(
      target.includes('document')
        ? 'Ya tienes una clienta con ese DNI.'
        : 'Ya tienes una clienta con ese celular.',
    );
  }
  throw error;
}
