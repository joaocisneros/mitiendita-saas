import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

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
        expiresIn: 60 * 60 * 8, // 8 horas
      },
    );
    return { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email } };
  }

  /** Métricas globales de la plataforma. */
  async stats() {
    const [total, active, suspended, orders, gross] = await Promise.all([
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.company.count({ where: { deletedAt: null, status: 'active' } }),
      this.prisma.company.count({ where: { deletedAt: null, status: 'suspended' } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'approved' },
        _sum: { total: true },
      }),
    ]);
    return {
      totalCompanies: total,
      activeCompanies: active,
      suspendedCompanies: suspended,
      totalOrders: orders,
      grossVolume: (gross._sum.total ?? 0).toString(),
    };
  }

  async listCompanies(search?: string) {
    const companies = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        ...(search ? { name: { contains: search } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { select: { name: true, slug: true } },
        _count: { select: { orders: true } },
      },
    });
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      subdomain: c.subdomain,
      status: c.status,
      plan: c.plan?.name ?? null,
      orders: c._count.orders,
      createdAt: c.createdAt,
    }));
  }

  async setStatus(id: string, status: 'active' | 'suspended') {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    await this.prisma.company.update({ where: { id }, data: { status } });
    return { ok: true, status };
  }

  async assignPlan(id: string, planId: number) {
    const [company, plan] = await Promise.all([
      this.prisma.company.findFirst({ where: { id, deletedAt: null } }),
      this.prisma.plan.findUnique({ where: { id: planId } }),
    ]);
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    if (!plan) throw new NotFoundException('Plan no encontrado.');
    await this.prisma.company.update({ where: { id }, data: { planId } });
    return { ok: true, plan: plan.name };
  }

  listPlans() {
    return this.prisma.plan.findMany({ orderBy: { priceMonth: 'asc' } });
  }
}
