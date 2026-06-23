import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, search?: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where = {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastPurchaseAt: 'desc' }, { createdAt: 'desc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          _count: { select: { orders: true } },
          orders: {
            where: { paymentStatus: 'approved' },
            select: { total: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: items.map(({ orders, _count, ...customer }) => ({
        ...customer,
        ordersCount: _count.orders,
        totalSpent: orders
          .reduce((sum, order) => sum + Number(order.total), 0)
          .toFixed(2),
      })),
      total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async findOne(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            publicCode: true,
            status: true,
            paymentStatus: true,
            total: true,
            currency: true,
            createdAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    return customer;
  }
}
