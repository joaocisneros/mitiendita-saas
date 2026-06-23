import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isValidSubdomain,
  normalizeSubdomain,
} from '../../common/utils/subdomain.util';
import type { CompanyStatus } from '../../../generated/prisma/client';
import { CreateCompanyDto, UpdateCompanyDto } from '../dto/company.dto';
import { SaAuditService } from './sa-audit.service';
import { SaUsersService } from './sa-users.service';

@Injectable()
export class SaCompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: SaAuditService,
    private readonly users: SaUsersService,
  ) {}

  async create(actorId: string, dto: CreateCompanyDto) {
    const subdomain = normalizeSubdomain(dto.subdomain);
    if (!isValidSubdomain(subdomain)) {
      throw new BadRequestException(
        'El subdominio solo puede incluir letras, números y guiones, entre 3 y 63 caracteres.',
      );
    }

    const email = dto.email.toLowerCase().trim();
    const [reserved, existingCompany, existingUser, selectedPlan, settings] =
      await Promise.all([
        this.prisma.reservedSubdomain.findUnique({ where: { slug: subdomain } }),
        this.prisma.company.findUnique({ where: { subdomain } }),
        this.prisma.user.findUnique({ where: { email } }),
        dto.planId
          ? this.prisma.plan.findUnique({ where: { id: dto.planId } })
          : this.prisma.plan.findUnique({ where: { slug: 'basico' } }),
        this.prisma.platformSettings.findUnique({ where: { id: 1 } }),
      ]);

    if (reserved) throw new ConflictException('Ese subdominio está reservado.');
    if (existingCompany) {
      throw new ConflictException('Ese subdominio ya está en uso.');
    }
    if (existingUser) {
      throw new ConflictException('Ese correo ya está registrado.');
    }
    if (dto.planId && !selectedPlan) {
      throw new NotFoundException('El plan seleccionado no existe.');
    }
    if (selectedPlan && !selectedPlan.isActive) {
      throw new BadRequestException('El plan seleccionado está inactivo.');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (settings?.trialDays ?? 14));
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const created = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.commercialName.trim(),
          subdomain,
          planId: selectedPlan?.id ?? null,
          subscriptionStatus: 'trial',
          currentPeriodEndsAt: trialEndsAt,
        },
      });
      await tx.companySettings.create({
        data: {
          companyId: company.id,
          storeName: dto.commercialName.trim(),
          businessType: dto.businessType?.trim() || null,
          whatsappNumber: dto.whatsappNumber.replace(/\s/g, ''),
        },
      });
      const owner = await tx.user.create({
        data: { name: dto.responsibleName.trim(), email, passwordHash },
      });
      await tx.membership.create({
        data: { userId: owner.id, companyId: company.id, role: 'OWNER' },
      });
      await tx.superAdminAudit.create({
        data: {
          superAdminId: actorId,
          companyId: company.id,
          action: 'company.created',
          details: { subdomain, planId: selectedPlan?.id ?? null },
        },
      });
      return { company, owner };
    });

    return {
      id: created.company.id,
      name: created.company.name,
      subdomain: created.company.subdomain,
      owner: { name: created.owner.name, email: created.owner.email },
      trialEndsAt,
    };
  }

  async list(options: {
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
    const paymentAudits = companies.length
      ? await this.prisma.superAdminAudit.findMany({
          where: {
            action: 'subscription.paid',
            companyId: { in: companies.map((company) => company.id) },
          },
          orderBy: { createdAt: 'desc' },
          select: { companyId: true, createdAt: true },
        })
      : [];
    const lastPaymentByCompany = new Map<string, Date>();
    for (const entry of paymentAudits) {
      if (entry.companyId && !lastPaymentByCompany.has(entry.companyId)) {
        lastPaymentByCompany.set(entry.companyId, entry.createdAt);
      }
    }

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
        subscriptionStatus: company.subscriptionStatus,
        currentPeriodEndsAt: company.currentPeriodEndsAt,
        lastPaymentAt: lastPaymentByCompany.get(company.id) ?? null,
        createdAt: company.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async get(id: string) {
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

  /** Edita datos comerciales de la empresa y su tienda (no toca al propietario). */
  async update(actorId: string, id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');

    let subdomain: string | undefined;
    if (dto.subdomain !== undefined) {
      subdomain = normalizeSubdomain(dto.subdomain);
      if (!isValidSubdomain(subdomain)) {
        throw new BadRequestException(
          'El subdominio solo puede incluir letras, números y guiones, entre 3 y 63 caracteres.',
        );
      }
      if (subdomain !== company.subdomain) {
        const [reserved, taken] = await Promise.all([
          this.prisma.reservedSubdomain.findUnique({
            where: { slug: subdomain },
          }),
          this.prisma.company.findUnique({ where: { subdomain } }),
        ]);
        if (reserved) {
          throw new ConflictException('Ese subdominio está reservado.');
        }
        if (taken && taken.id !== id) {
          throw new ConflictException('Ese subdominio ya está en uso.');
        }
      }
    }

    const companyData = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(subdomain ? { subdomain } : {}),
    };
    const settingsData = {
      ...(dto.businessType !== undefined
        ? { businessType: dto.businessType.trim() || null }
        : {}),
      ...(dto.whatsappNumber !== undefined
        ? { whatsappNumber: dto.whatsappNumber.replace(/\s/g, '') || null }
        : {}),
      ...(dto.storeAddress !== undefined
        ? { storeAddress: dto.storeAddress.trim() || null }
        : {}),
      ...(dto.allowsPickup !== undefined
        ? { allowsPickup: dto.allowsPickup }
        : {}),
      ...(dto.allowsDelivery !== undefined
        ? { allowsDelivery: dto.allowsDelivery }
        : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(companyData).length) {
        await tx.company.update({ where: { id }, data: companyData });
      }
      if (Object.keys(settingsData).length) {
        await tx.companySettings.update({
          where: { companyId: id },
          data: settingsData,
        });
      }
    });
    await this.audit.log(actorId, 'company.updated', id, {
      fields: Object.keys({ ...companyData, ...settingsData }),
    });
    return this.get(id);
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

  async remove(actorId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
    await this.audit.log(actorId, 'company.deleted', id);
    return { ok: true };
  }

  async resetOwnerPassword(
    actorId: string,
    companyId: string,
    newPassword: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { companyId, role: 'OWNER' },
    });
    if (!membership) {
      throw new NotFoundException('La empresa no tiene propietario.');
    }
    return this.users.resetPassword(actorId, membership.userId, newPassword);
  }

  /** Genera un token del propietario para dar soporte (impersonar). */
  async impersonate(actorId: string, companyId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { companyId, role: 'OWNER' },
      include: { user: true },
    });
    if (!membership) {
      throw new NotFoundException('La empresa no tiene propietario.');
    }
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
    await this.audit.log(actorId, 'company.impersonated', companyId);
    return { accessToken };
  }
}
