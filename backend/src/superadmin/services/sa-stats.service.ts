import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Métricas globales del dashboard del superadmin. */
@Injectable()
export class SaStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(requestedDays = 30) {
    const rangeDays = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - rangeDays);
    const previousRangeStart = new Date(rangeStart);
    previousRangeStart.setDate(previousRangeStart.getDate() - rangeDays);
    const expiresSoonAt = new Date(now);
    expiresSoonAt.setDate(expiresSoonAt.getDate() + 3);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total,
      active,
      suspended,
      orders,
      gross,
      newThisMonth,
      newInRange,
      newInPreviousRange,
      cancelledInRange,
      companiesAtRangeStart,
      expiringSoon,
      pastDue,
      suspendedForDebt,
      atRisk,
      mrrCompanies,
      growthRaw,
      gmvRaw,
      planGroups,
      plans,
    ] = await Promise.all([
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
      this.prisma.company.count({
        where: { createdAt: { gte: rangeStart, lte: now } },
      }),
      this.prisma.company.count({
        where: { createdAt: { gte: previousRangeStart, lt: rangeStart } },
      }),
      this.prisma.company.count({
        where: {
          OR: [
            { subscriptionStatus: 'cancelled', updatedAt: { gte: rangeStart } },
            { deletedAt: { gte: rangeStart } },
          ],
        },
      }),
      this.prisma.company.count({
        where: {
          createdAt: { lt: rangeStart },
          OR: [{ deletedAt: null }, { deletedAt: { gte: rangeStart } }],
          NOT: {
            subscriptionStatus: 'cancelled',
            updatedAt: { lt: rangeStart },
          },
        },
      }),
      this.prisma.company.count({
        where: {
          deletedAt: null,
          subscriptionStatus: { in: ['trial', 'active'] },
          currentPeriodEndsAt: { gt: now, lte: expiresSoonAt },
        },
      }),
      this.prisma.company.count({
        where: { deletedAt: null, subscriptionStatus: 'past_due' },
      }),
      this.prisma.company.count({
        where: {
          deletedAt: null,
          status: 'suspended',
          subscriptionStatus: 'past_due',
        },
      }),
      this.prisma.company.count({
        where: {
          deletedAt: null,
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
        },
      }),
      this.prisma.company.findMany({
        where: {
          deletedAt: null,
          status: 'active',
          subscriptionStatus: 'active',
        },
        select: { plan: { select: { priceMonth: true } } },
      }),
      this.prisma.$queryRaw<Array<{ ym: string; c: bigint }>>`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS c
        FROM companies
        WHERE deleted_at IS NULL
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY ym ORDER BY ym`,
      this.prisma.$queryRaw<Array<{ ym: string; total: unknown }>>`
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
               COALESCE(SUM(total), 0) AS total
        FROM orders
        WHERE payment_status = 'approved'
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY ym ORDER BY ym`,
      this.prisma.company.groupBy({
        by: ['planId'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.plan.findMany({ select: { id: true, name: true } }),
    ]);

    const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
    const mrr = mrrCompanies.reduce(
      (sum, company) => sum + Number(company.plan?.priceMonth ?? 0),
      0,
    );
    const churnRate = companiesAtRangeStart
      ? (cancelledInRange / companiesAtRangeStart) * 100
      : 0;
    const growthRate = newInPreviousRange
      ? ((newInRange - newInPreviousRange) / newInPreviousRange) * 100
      : newInRange > 0
        ? 100
        : 0;

    return {
      rangeDays,
      totalCompanies: total,
      activeCompanies: active,
      suspendedCompanies: suspended,
      totalOrders: orders,
      grossVolume: (gross._sum.total ?? 0).toString(),
      mrr: mrr.toFixed(2),
      newCompaniesThisMonth: newThisMonth,
      newCompaniesInRange: newInRange,
      cancelledCompaniesInRange: cancelledInRange,
      growthRate: Number(growthRate.toFixed(1)),
      churnRate: Number(churnRate.toFixed(1)),
      retentionRate: Number(Math.max(0, 100 - churnRate).toFixed(1)),
      atRiskCompanies: atRisk,
      alerts: { expiringSoon, pastDue, suspendedForDebt, atRisk },
      companiesByMonth: growthRaw.map((row) => ({
        month: row.ym,
        count: Number(row.c),
      })),
      gmvByMonth: gmvRaw.map((row) => ({
        month: row.ym,
        total: Number(row.total ?? 0),
      })),
      planDistribution: planGroups.map((group) => ({
        plan: group.planId
          ? (planNames.get(group.planId) ?? 'Plan')
          : 'Sin plan',
        count: group._count._all,
      })),
    };
  }
}
