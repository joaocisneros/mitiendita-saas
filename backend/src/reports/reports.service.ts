import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string, fromStr?: string, toStr?: string) {
    const to = toStr ? new Date(toStr) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 29 * 86_400_000);
    from.setHours(0, 0, 0, 0);

    const approvedRange = {
      companyId,
      paymentStatus: 'approved' as const,
      confirmedAt: { gte: from, lte: to },
    };

    const [approvedOrders, byStatus, topRaw, customersRaw] = await Promise.all([
      this.prisma.order.findMany({
        where: approvedRange,
        select: { total: true, confirmedAt: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { companyId, createdAt: { gte: from, lte: to } },
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['name'],
        where: { order: approvedRange },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      this.prisma.order.groupBy({
        by: ['customerName', 'customerPhone'],
        where: approvedRange,
        _count: { _all: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
    ]);

    // Ventas por día.
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of approvedOrders) {
      const key = (o.confirmedAt ?? new Date()).toISOString().slice(0, 10);
      const cur = dayMap.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += Number(o.total);
      cur.orders += 1;
      dayMap.set(key, cur);
    }
    const salesByDay = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, revenue: v.revenue.toFixed(2), orders: v.orders }));

    const totalRevenue = approvedOrders.reduce((s, o) => s + Number(o.total), 0);

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders: approvedOrders.length,
      salesByDay,
      ordersByStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      topProducts: topRaw.map((t) => ({
        name: t.name,
        units: t._sum.quantity ?? 0,
        revenue: (t._sum.lineTotal ?? 0).toString(),
      })),
      frequentCustomers: customersRaw.map((c) => ({
        name: c.customerName,
        phone: c.customerPhone,
        orders: c._count._all,
        total: (c._sum.total ?? 0).toString(),
      })),
    };
  }
}
