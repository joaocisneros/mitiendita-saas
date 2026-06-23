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
import type {
  CompanyStatus,
  Prisma,
  SubscriptionStatus,
} from '../../generated/prisma/client';
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
    // Crecimiento de empresas por mes (últimos 6 meses).
    const growthRaw = await this.prisma.$queryRaw<
      Array<{ ym: string; c: bigint }>
    >`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS c
      FROM companies
      WHERE deleted_at IS NULL
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY ym ORDER BY ym`;

    // Distribución por plan.
    const [planGroups, plans] = await Promise.all([
      this.prisma.company.groupBy({
        by: ['planId'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.plan.findMany({ select: { id: true, name: true } }),
    ]);
    const planNames = new Map(plans.map((p) => [p.id, p.name]));

    return {
      totalCompanies: total,
      activeCompanies: active,
      suspendedCompanies: suspended,
      totalOrders: orders,
      grossVolume: (gross._sum.total ?? 0).toString(),
      newCompaniesThisMonth: newThisMonth,
      companiesByMonth: growthRaw.map((r) => ({
        month: r.ym,
        count: Number(r.c),
      })),
      planDistribution: planGroups.map((g) => ({
        plan: g.planId ? (planNames.get(g.planId) ?? 'Plan') : 'Sin plan',
        count: g._count._all,
      })),
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

  // ───────────────────── Suscripciones ─────────────────────

  async subscriptions(opts: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const valid = ['trial', 'active', 'past_due', 'cancelled'];
    const where = {
      deletedAt: null,
      ...(opts.status && valid.includes(opts.status)
        ? { subscriptionStatus: opts.status as SubscriptionStatus }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { currentPeriodEndsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { plan: { select: { name: true, priceMonth: true } } },
      }),
      this.prisma.company.count({ where }),
    ]);
    return {
      items: rows.map((c) => ({
        id: c.id,
        name: c.name,
        subdomain: c.subdomain,
        subscriptionStatus: c.subscriptionStatus,
        currentPeriodEndsAt: c.currentPeriodEndsAt,
        plan: c.plan?.name ?? null,
        price: (c.plan?.priceMonth ?? 0).toString(),
        notes: c.subscriptionNotes,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async markSubscriptionPaid(actorId: string, id: string, months = 1) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    const base =
      company.currentPeriodEndsAt && company.currentPeriodEndsAt > new Date()
        ? new Date(company.currentPeriodEndsAt)
        : new Date();
    base.setMonth(base.getMonth() + months);
    await this.prisma.company.update({
      where: { id },
      data: { subscriptionStatus: 'active', currentPeriodEndsAt: base },
    });
    await this.audit(actorId, 'subscription.paid', id, { months });
    return { ok: true, currentPeriodEndsAt: base };
  }

  async updateSubscription(
    actorId: string,
    id: string,
    dto: { status?: string; notes?: string; currentPeriodEndsAt?: string },
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    const valid = ['trial', 'active', 'past_due', 'cancelled'];
    await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.status && valid.includes(dto.status)
          ? { subscriptionStatus: dto.status as SubscriptionStatus }
          : {}),
        ...(dto.notes !== undefined ? { subscriptionNotes: dto.notes } : {}),
        ...(dto.currentPeriodEndsAt
          ? { currentPeriodEndsAt: new Date(dto.currentPeriodEndsAt) }
          : {}),
      },
    });
    await this.audit(actorId, 'subscription.updated', id, { status: dto.status });
    return { ok: true };
  }

  // ───────────────────── Usuarios globales ─────────────────────

  async listUsers(opts: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const where = opts.search
      ? {
          OR: [
            { name: { contains: opts.search } },
            { email: { contains: opts.search } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          memberships: {
            include: { company: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        role: u.memberships[0]?.role ?? null,
        company: u.memberships[0]?.company ?? null,
        createdAt: u.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async resetUserPassword(actorId: string, userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.audit(actorId, 'user.password_reset', undefined, { userId });
    return { ok: true };
  }

  async toggleUser(actorId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
    await this.audit(actorId, 'user.toggled', undefined, {
      userId,
      isActive: !user.isActive,
    });
    return { ok: true, isActive: !user.isActive };
  }

  // ───────────────────── Acciones sobre empresas ─────────────────────

  async deleteCompany(actorId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
    await this.audit(actorId, 'company.deleted', id);
    return { ok: true };
  }

  async resetOwnerPassword(actorId: string, companyId: string, newPassword: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { companyId, role: 'OWNER' },
    });
    if (!membership) throw new NotFoundException('La empresa no tiene propietario.');
    return this.resetUserPassword(actorId, membership.userId, newPassword);
  }

  /** Genera un token de acceso del propietario para dar soporte (impersonar). */
  async impersonate(actorId: string, companyId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { companyId, role: 'OWNER' },
      include: { user: true },
    });
    if (!membership) throw new NotFoundException('La empresa no tiene propietario.');
    const accessToken = await this.jwt.signAsync(
      {
        sub: membership.userId,
        email: membership.user.email,
        companyId,
        role: 'OWNER',
      },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 60 * 60, // 1 hora de soporte
      },
    );
    await this.audit(actorId, 'company.impersonated', companyId);
    return { accessToken };
  }

  // ───────────────────── Configuración de plataforma ─────────────────────

  getPlatformSettings() {
    return this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async updatePlatformSettings(
    actorId: string,
    dto: Record<string, unknown>,
  ) {
    const allowed = [
      'platformName',
      'logoUrl',
      'mainDomain',
      'currency',
      'supportWhatsapp',
      'supportEmail',
      'terms',
      'privacy',
      'trialDays',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    await this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    await this.audit(actorId, 'platform.settings_updated');
    return this.getPlatformSettings();
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
