import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { CompanyStatus, Prisma } from '../../generated/prisma/client';
import { CreatePlanDto, UpdatePlanDto } from './dto/superadmin.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    const invalid = new UnauthorizedException('Credenciales incorrectas.');
    if (!admin || !admin.isActive) throw invalid;
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw invalid;

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, scope: 'super' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 60 * 60 * 8,
      },
    );
    return {
      accessToken,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    };
  }

  async stats() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [total, active, suspended, orders, gross, newThisMonth] =
      await Promise.all([
        this.prisma.company.count({ where: { deletedAt: null } }),
        this.prisma.company.count({
          where: { deletedAt: null, status: 'active' },
        }),
        this.prisma.company.count({
          where: { deletedAt: null, status: 'suspended' },
        }),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          where: { paymentStatus: 'approved' },
          _sum: { total: true },
        }),
        this.prisma.company.count({
          where: { deletedAt: null, createdAt: { gte: monthStart } },
        }),
      ]);
    return {
      totalCompanies: total,
      activeCompanies: active,
      suspendedCompanies: suspended,
      totalOrders: orders,
      grossVolume: (gross._sum.total ?? 0).toString(),
      newCompaniesThisMonth: newThisMonth,
    };
  }

  async listCompanies(options: {
    search?: string;
    status?: string;
    planId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const normalizedStatus =
      options.status &&
      ['active', 'suspended', 'inactive'].includes(options.status)
        ? (options.status as CompanyStatus)
        : undefined;
    const where = {
      deletedAt: null,
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { subdomain: { contains: options.search } },
            ],
          }
        : {}),
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
      ...(options.planId ? { planId: options.planId } : {}),
    };
    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          plan: { select: { id: true, name: true, slug: true } },
          settings: { select: { storeName: true, businessType: true } },
          memberships: {
            where: { role: 'OWNER' },
            take: 1,
            include: { user: { select: { name: true, email: true } } },
          },
          _count: { select: { orders: true, products: true, customers: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items: companies.map((company) => ({
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        status: company.status,
        plan: company.plan,
        businessType: company.settings?.businessType ?? null,
        owner: company.memberships[0]?.user ?? null,
        orders: company._count.orders,
        products: company._count.products,
        customers: company._count.customers,
        createdAt: company.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getCompany(id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        plan: true,
        settings: true,
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, isActive: true },
            },
          },
        },
        _count: { select: { orders: true, products: true, customers: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    const [gross, recentOrders] = await Promise.all([
      this.prisma.order.aggregate({
        where: { companyId: id, paymentStatus: 'approved' },
        _sum: { total: true },
      }),
      this.prisma.order.findMany({
        where: { companyId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          publicCode: true,
          customerName: true,
          status: true,
          paymentStatus: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      ...company,
      grossVolume: (gross._sum.total ?? 0).toString(),
      recentOrders,
    };
  }

  async setStatus(actorId: string, id: string, status: 'active' | 'suspended') {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    await this.prisma.$transaction([
      this.prisma.company.update({ where: { id }, data: { status } }),
      this.prisma.superAdminAudit.create({
        data: {
          superAdminId: actorId,
          companyId: id,
          action:
            status === 'active' ? 'company.activated' : 'company.suspended',
          details: { previousStatus: company.status, newStatus: status },
        },
      }),
    ]);
    return { ok: true, status };
  }

  async assignPlan(actorId: string, id: string, planId: number) {
    const [company, plan] = await Promise.all([
      this.prisma.company.findFirst({ where: { id, deletedAt: null } }),
      this.prisma.plan.findUnique({ where: { id: planId } }),
    ]);
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    if (!plan) throw new NotFoundException('Plan no encontrado.');
    if (!plan.isActive) {
      throw new BadRequestException('No se puede asignar un plan inactivo.');
    }
    await this.prisma.$transaction([
      this.prisma.company.update({ where: { id }, data: { planId } }),
      this.prisma.superAdminAudit.create({
        data: {
          superAdminId: actorId,
          companyId: id,
          action: 'company.plan_changed',
          details: { previousPlanId: company.planId, newPlanId: planId },
        },
      }),
    ]);
    return { ok: true, plan: plan.name };
  }

  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { priceMonth: 'asc' } });
  }

  async createPlan(actorId: string, dto: CreatePlanDto) {
    const slug = dto.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');
    if (await this.prisma.plan.findUnique({ where: { slug } })) {
      throw new ConflictException('Ya existe un plan con ese identificador.');
    }
    const plan = await this.prisma.plan.create({
      data: { ...dto, slug, maxProducts: dto.maxProducts ?? null },
    });
    await this.audit(actorId, 'plan.created', undefined, { planId: plan.id });
    return plan;
  }

  async updatePlan(actorId: string, id: number, dto: UpdatePlanDto) {
    const current = await this.prisma.plan.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Plan no encontrado.');
    const slug = dto.slug
      ? dto.slug
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, '-')
      : undefined;
    if (slug) {
      const duplicate = await this.prisma.plan.findFirst({
        where: { slug, NOT: { id } },
      });
      if (duplicate) {
        throw new ConflictException('Ya existe un plan con ese identificador.');
      }
    }
    const plan = await this.prisma.plan.update({
      where: { id },
      data: { ...dto, slug },
    });
    await this.audit(actorId, 'plan.updated', undefined, { planId: id });
    return plan;
  }

  async listAudits(page = 1, limit = 30) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [rows, total] = await Promise.all([
      this.prisma.superAdminAudit.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { superAdmin: { select: { name: true, email: true } } },
      }),
      this.prisma.superAdminAudit.count(),
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
      })),
      total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
    };
  }

  private async audit(
    actorId: string,
    action: string,
    companyId?: string,
    details?: Prisma.InputJsonValue,
  ) {
    await this.prisma.superAdminAudit.create({
      data: {
        superAdminId: actorId,
        action,
        companyId: companyId ?? null,
        details,
      },
    });
  }
}
