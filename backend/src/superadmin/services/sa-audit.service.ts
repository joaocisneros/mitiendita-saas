import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

/**
 * Registro y consulta de la bitácora de acciones sensibles del superadmin.
 * `log()` lo reutilizan los demás servicios para auditar sus operaciones.
 */
@Injectable()
export class SaAuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    actorId: string,
    action: string,
    companyId?: string,
    details?: Prisma.InputJsonValue,
  ) {
    return this.prisma.superAdminAudit.create({
      data: {
        superAdminId: actorId,
        action,
        companyId: companyId ?? null,
        details,
      },
    });
  }

  async list(opts: { action?: string; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
    const where = opts.action ? { action: opts.action } : {};
    const [rows, superTotal] = await Promise.all([
      this.prisma.superAdminAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: page * limit,
        include: { superAdmin: { select: { name: true, email: true } } },
      }),
      this.prisma.superAdminAudit.count({ where }),
    ]);
    const tenantWhere = opts.action ? { action: opts.action } : {};
    let tenantRows: Awaited<
      ReturnType<typeof this.prisma.tenantAudit.findMany>
    > = [];
    let tenantTotal = 0;
    try {
      [tenantRows, tenantTotal] = await Promise.all([
        this.prisma.tenantAudit.findMany({
          where: tenantWhere,
          orderBy: { createdAt: 'desc' },
          take: page * limit,
        }),
        this.prisma.tenantAudit.count({ where: tenantWhere }),
      ]);
    } catch (error) {
      if (!this.isMissingAuditTable(error)) throw error;
    }
    const companyIds = [
      ...new Set([
        ...rows.flatMap((row) => (row.companyId ? [row.companyId] : [])),
        ...tenantRows.map((row) => row.companyId),
      ]),
    ];
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true, subdomain: true },
    });
    const names = new Map(
      companies.map((company) => [company.id, company.name]),
    );
    const subdomains = new Map(
      companies.map((company) => [company.id, company.subdomain]),
    );
    const entityLabels = await this.resolveEntityLabels(tenantRows);
    const referencedUserIds = rows.flatMap((row) => {
      const details = row.details as Record<string, unknown> | null;
      return typeof details?.userId === 'string' ? [details.userId] : [];
    });
    const referencedUsers = referencedUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: [...new Set(referencedUserIds)] } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const usersById = new Map(referencedUsers.map((user) => [user.id, user]));
    const adminItems = rows.map((row) => ({
      ...row,
      companyName: row.companyId ? (names.get(row.companyId) ?? null) : null,
      companySubdomain: row.companyId
        ? (subdomains.get(row.companyId) ?? null)
        : null,
      actorRole: 'Superadministrador',
      module: row.action.split('.')[0],
      result: 'success',
      entityId: row.companyId,
      entityLabel:
        typeof (row.details as Record<string, unknown> | null)?.userId ===
        'string'
          ? (usersById.get(
              String((row.details as Record<string, unknown>).userId),
            )?.name ?? null)
          : null,
      details: this.hydrateUserDetails(row.details, usersById),
    }));
    const userItems = tenantRows.map((row) => ({
      ...row,
      companyName: names.get(row.companyId) ?? null,
      companySubdomain: subdomains.get(row.companyId) ?? null,
      actorRole: row.actorRole === 'OWNER' ? 'Dueño' : 'Empleado',
      superAdmin: { name: row.actorName, email: row.actorEmail },
      entityLabel:
        entityLabels.get(`${row.module}:${row.entityId ?? ''}`) ??
        this.detailEntityLabel(row.details),
    }));
    const combined = [...adminItems, ...userItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const total = superTotal + tenantTotal;
    return {
      items: combined.slice((page - 1) * limit, page * limit),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  private detailEntityLabel(details: Prisma.JsonValue | null) {
    if (!details || typeof details !== 'object' || Array.isArray(details))
      return null;
    const label = (details as Record<string, unknown>).entityLabel;
    return typeof label === 'string' ? label : null;
  }

  private hydrateUserDetails(
    details: Prisma.JsonValue | null,
    users: Map<string, { id: string; name: string; email: string }>,
  ) {
    if (!details || typeof details !== 'object' || Array.isArray(details))
      return details;
    const data = details as Record<string, unknown>;
    if (typeof data.userId !== 'string') return details;
    const user = users.get(data.userId);
    if (!user) return details;
    const { userId: _userId, ...rest } = data;
    return { ...rest, userName: user.name, userEmail: user.email };
  }

  private async resolveEntityLabels(
    rows: Array<{ module: string; entityId: string | null }>,
  ) {
    const labels = new Map<string, string>();
    const ids = (module: string) => [
      ...new Set(
        rows
          .filter((row) => row.module === module)
          .flatMap((row) => (row.entityId ? [row.entityId] : [])),
      ),
    ];
    const [
      products,
      categories,
      orders,
      appointments,
      subscriptions,
      customers,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: ids('product') } },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: { id: { in: ids('category') } },
        select: { id: true, name: true },
      }),
      this.prisma.order.findMany({
        where: { id: { in: ids('order') } },
        select: { id: true, publicCode: true, customerName: true },
      }),
      this.prisma.appointment.findMany({
        where: { id: { in: ids('appointment') } },
        select: { id: true, publicCode: true, serviceName: true },
      }),
      this.prisma.subscription.findMany({
        where: { id: { in: ids('subscription') } },
        select: { id: true, publicCode: true, planName: true },
      }),
      this.prisma.customer.findMany({
        where: { id: { in: ids('customer') } },
        select: { id: true, name: true },
      }),
    ]);
    products.forEach((item) => labels.set(`product:${item.id}`, item.name));
    categories.forEach((item) => labels.set(`category:${item.id}`, item.name));
    orders.forEach((item) =>
      labels.set(
        `order:${item.id}`,
        `Pedido ${item.publicCode} · ${item.customerName}`,
      ),
    );
    appointments.forEach((item) =>
      labels.set(
        `appointment:${item.id}`,
        `${item.serviceName}${item.publicCode ? ` · ${item.publicCode}` : ''}`,
      ),
    );
    subscriptions.forEach((item) =>
      labels.set(
        `subscription:${item.id}`,
        `${item.planName}${item.publicCode ? ` · ${item.publicCode}` : ''}`,
      ),
    );
    customers.forEach((item) => labels.set(`customer:${item.id}`, item.name));
    return labels;
  }

  /** Acciones distintas registradas, para poblar el filtro del frontend. */
  async actions() {
    const adminRows = await this.prisma.superAdminAudit.findMany({
      distinct: ['action'],
      select: { action: true },
    });
    let tenantRows: { action: string }[] = [];
    try {
      tenantRows = await this.prisma.tenantAudit.findMany({
        distinct: ['action'],
        select: { action: true },
      });
    } catch (error) {
      if (!this.isMissingAuditTable(error)) throw error;
    }
    return [
      ...new Set([...adminRows, ...tenantRows].map((row) => row.action)),
    ].sort();
  }

  private isMissingAuditTable(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      ['P2021', 'P2022'].includes(String(error.code))
    );
  }
}
