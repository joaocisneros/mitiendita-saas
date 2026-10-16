import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BUYER_CUSTOMER, VALID_ORDER } from '../common/utils/valid-order.util';
import { toTitleCase } from '../common/utils/text.util';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clientes reales del negocio: no aparecen quienes solo iniciaron un pedido
   * y lo abandonaron, se los rechazaron o lo cancelaron.
   */
  async findAll(companyId: string, search?: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where = {
      companyId,
      AND: [
        BUYER_CUSTOMER,
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search } },
                  { phone: { contains: search } },
                ],
              },
            ]
          : []),
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastPurchaseAt: 'desc' }, { createdAt: 'desc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          orders: {
            where: VALID_ORDER,
            orderBy: { createdAt: 'desc' },
            select: {
              total: true,
              createdAt: true,
              customerName: true,
              address: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: items.map(({ orders, ...customer }) => {
        // Nombre, dirección y fecha salen de la última compra aprobada, no
        // del último intento (que pudo ser cancelado con otros datos).
        const latest = orders[0];
        return {
          ...customer,
          name: latest ? toTitleCase(latest.customerName) : customer.name,
          address: latest?.address ?? customer.address,
          lastPurchaseAt: latest?.createdAt ?? customer.lastPurchaseAt,
          ordersCount: orders.length,
          totalSpent: orders
            .reduce((sum, order) => sum + Number(order.total), 0)
            .toFixed(2),
        };
      }),
      total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async findOne(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId, ...BUYER_CUSTOMER },
      include: {
        orders: {
          where: VALID_ORDER,
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
            customerName: true,
            address: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    const latest = customer.orders[0];
    return {
      ...customer,
      name: latest ? toTitleCase(latest.customerName) : customer.name,
      address: latest?.address ?? customer.address,
      lastPurchaseAt: latest?.createdAt ?? customer.lastPurchaseAt,
    };
  }
}
