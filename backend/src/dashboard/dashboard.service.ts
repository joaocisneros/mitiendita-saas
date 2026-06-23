import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      pendingOrders,
      approvedToday,
      recentOrders,
      lowStock,
      topProducts,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { companyId, createdAt: { gte: startOfDay } },
      }),
      this.prisma.order.count({
        where: { companyId, status: 'pending' },
      }),
      // Ventas = pagos aprobados hoy.
      this.prisma.order.findMany({
        where: {
          companyId,
          paymentStatus: 'approved',
          confirmedAt: { gte: startOfDay },
        },
        select: { total: true },
      }),
      this.prisma.order.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          publicCode: true,
          status: true,
          paymentStatus: true,
          customerName: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      }),
      this.prisma.product.findMany({
        where: { companyId, deletedAt: null, isActive: true },
        select: { id: true, name: true, stock: true, reserved: true },
      }),
      this.prisma.$queryRaw<
        Array<{ productId: string | null; name: string; units: bigint }>
      >`
        SELECT oi.product_id AS productId, oi.name, SUM(oi.quantity) AS units
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.company_id = ${companyId}
          AND o.payment_status = 'approved'
        GROUP BY oi.product_id, oi.name
        ORDER BY units DESC
        LIMIT 5`,
    ]);

    const salesToday = approvedToday.reduce((s, o) => s + Number(o.total), 0);
    const lowStockProducts = lowStock
      .filter((p) => p.stock - p.reserved <= LOW_STOCK_THRESHOLD)
      .map((p) => ({
        id: p.id,
        name: p.name,
        available: p.stock - p.reserved,
      }));

    return {
      salesToday: salesToday.toFixed(2),
      ordersToday,
      pendingOrders,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 10),
      recentOrders,
      topProducts: topProducts.map((product) => ({
        id: product.productId,
        name: product.name,
        units: Number(product.units),
      })),
    };
  }
}
