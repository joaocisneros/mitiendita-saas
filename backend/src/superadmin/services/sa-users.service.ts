import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { SaAuditService } from './sa-audit.service';

/** Gestión de los usuarios (dueños/empleados) de todas las empresas. */
@Injectable()
export class SaUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SaAuditService,
  ) {}

  async list(opts: { search?: string; page?: number; limit?: number }) {
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

  async resetPassword(actorId: string, userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.audit.log(actorId, 'user.password_reset', undefined, { userId });
    return { ok: true };
  }

  async toggle(actorId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
    await this.audit.log(actorId, 'user.toggled', undefined, {
      userId,
      isActive: !user.isActive,
    });
    return { ok: true, isActive: !user.isActive };
  }
}
