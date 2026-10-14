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

  async list(opts: { action?: string; module?: string; search?: string; company?: string; responsible?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
    const conditions: Prisma.SuperAdminAuditWhereInput[] = [];
    if (opts.action) conditions.push({ action: opts.action });
    if (opts.module) conditions.push({ action: { startsWith: `${opts.module}.` } });
    if (opts.search) conditions.push({ OR: [{ action: { contains: opts.search } }, { superAdmin: { OR: [{ name: { contains: opts.search } }, { email: { contains: opts.search } }] } }] });
    if (opts.responsible) conditions.push({ superAdmin: { OR: [{ name: { contains: opts.responsible } }, { email: { contains: opts.responsible } }] } });
    if (opts.company) {
      const companies = await this.prisma.company.findMany({ where: { OR: [{ name: { contains: opts.company } }, { subdomain: { contains: opts.company } }] }, select: { id: true } });
      conditions.push({ companyId: { in: companies.map((company) => company.id) } });
    }
    if (opts.from || opts.to) conditions.push({ createdAt: { ...(opts.from ? { gte: new Date(`${opts.from}T00:00:00`) } : {}), ...(opts.to ? { lte: new Date(`${opts.to}T23:59:59.999`) } : {}) } });
    const where: Prisma.SuperAdminAuditWhereInput = conditions.length ? { AND: conditions } : {};
    const [rows, total] = await Promise.all([
      this.prisma.superAdminAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { superAdmin: { select: { name: true, email: true } } },
      }),
      this.prisma.superAdminAudit.count({ where }),
    ]);
    const companyIds = [
      ...new Set(rows.flatMap((row) => (row.companyId ? [row.companyId] : []))),
    ];
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });
    const names = new Map(
      companies.map((company) => [company.id, company.name]),
    );
    return {
      items: rows.map((row) => ({
        ...row,
        companyName: row.companyId ? (names.get(row.companyId) ?? null) : null,
        actorRole: 'Superadministrador',
        module: row.action.split('.')[0],
        result: 'success',
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** Acciones distintas registradas, para poblar el filtro del frontend. */
  async actions() {
    const rows = await this.prisma.superAdminAudit.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return rows.map((row) => row.action);
  }
}
