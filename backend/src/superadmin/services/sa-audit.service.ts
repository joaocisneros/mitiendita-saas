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
    }));
    const userItems = tenantRows.map((row) => ({
      ...row,
      companyName: names.get(row.companyId) ?? null,
      companySubdomain: subdomains.get(row.companyId) ?? null,
      actorRole: row.actorRole === 'OWNER' ? 'Dueño' : 'Empleado',
      superAdmin: { name: row.actorName, email: row.actorEmail },
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
