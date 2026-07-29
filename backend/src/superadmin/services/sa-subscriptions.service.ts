import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SubscriptionStatus } from '../../../generated/prisma/client';
import {
  SUBSCRIPTION_STATUSES,
  UpdateSubscriptionDto,
} from '../dto/subscription.dto';
import { SaAuditService } from './sa-audit.service';

@Injectable()
export class SaSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SaAuditService,
  ) {}

  /** Mismo criterio que las tarjetas de "Acciones urgentes" del dashboard, para que el link filtre exactamente eso. */
  private alertWhere(alert?: string): Record<string, unknown> | null {
    const now = new Date();
    const expiresSoonAt = new Date(now);
    expiresSoonAt.setDate(expiresSoonAt.getDate() + 3);
    switch (alert) {
      case 'expiringSoon':
        return {
          subscriptionStatus: { in: ['trial', 'active'] },
          currentPeriodEndsAt: { gt: now, lte: expiresSoonAt },
        };
      case 'pastDue':
        return { subscriptionStatus: 'past_due' };
      case 'suspendedForDebt':
        return { status: 'suspended', subscriptionStatus: 'past_due' };
      case 'atRisk':
        return {
          OR: [
            { subscriptionStatus: 'past_due' },
            {
              subscriptionStatus: { in: ['trial', 'active'] },
              currentPeriodEndsAt: { lt: now },
            },
            {
              subscriptionStatus: { in: ['trial', 'active'] },
              currentPeriodEndsAt: null,
            },
          ],
        };
      default:
        return null;
    }
  }

  async list(opts: {
    status?: string;
    alert?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const alertWhere = this.alertWhere(opts.alert);
    const conditions: Record<string, unknown>[] = [{ deletedAt: null }];
    if (alertWhere) {
      conditions.push(alertWhere);
    } else if (
      opts.status &&
      (SUBSCRIPTION_STATUSES as readonly string[]).includes(opts.status)
    ) {
      conditions.push({ subscriptionStatus: opts.status as SubscriptionStatus });
    }
    if (opts.search) {
      conditions.push({
        OR: [
          { name: { contains: opts.search } },
          { subdomain: { contains: opts.search } },
        ],
      });
    }
    const where = { AND: conditions };
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

  async markPaid(actorId: string, id: string, months = 1) {
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
    await this.audit.log(actorId, 'subscription.paid', id, { months });
    return { ok: true, currentPeriodEndsAt: base };
  }

  async update(actorId: string, id: string, dto: UpdateSubscriptionDto) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');
    await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.status
          ? { subscriptionStatus: dto.status as SubscriptionStatus }
          : {}),
        ...(dto.notes !== undefined ? { subscriptionNotes: dto.notes } : {}),
        ...(dto.currentPeriodEndsAt
          ? { currentPeriodEndsAt: new Date(dto.currentPeriodEndsAt) }
          : {}),
      },
    });
    await this.audit.log(actorId, 'subscription.updated', id, {
      status: dto.status,
    });
    return { ok: true };
  }
}
