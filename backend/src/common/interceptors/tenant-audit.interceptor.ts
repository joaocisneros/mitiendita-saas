import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';

type AuditRequest = Request & { user?: AuthUser };

const ACTIONS: Record<string, string> = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

const MODULES: Record<string, string> = {
  products: 'product',
  categories: 'category',
  orders: 'order',
  appointments: 'appointment',
  inventory: 'inventory',
  customers: 'customer',
  subscriptions: 'subscription',
  'store-settings': 'store',
  auth: 'profile',
};

function safeDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const blocked = /password|token|secret|authorization|qr|image|file/i;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !blocked.test(key))
    .slice(0, 20)
    .map(([key, item]) => [
      key,
      typeof item === 'string' && item.length > 160
        ? `${item.slice(0, 160)}…`
        : item,
    ]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

@Injectable()
export class TenantAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const user = request.user;
    const operation = ACTIONS[request.method];
    if (!user || user.scope === 'super' || !user.companyId || !operation) {
      return next.handle();
    }

    const path = (request.originalUrl || request.url).split('?')[0];
    const segments = path.split('/').filter(Boolean);
    const root = segments[0] === 'api' ? segments[1] : segments[0];
    if (!root || ['auth', 'media'].includes(root) && path.includes('login')) {
      return next.handle();
    }
    const module = MODULES[root] ?? root.replace(/-/g, '_');
    const action = `${module}.${operation}`;
    const rawEntityId = request.params?.id;
    const entityId = Array.isArray(rawEntityId)
      ? (rawEntityId[0] ?? null)
      : (rawEntityId ?? null);
    const details = safeDetails(request.body);

    return next.handle().pipe(
      tap(() => {
        void this.writeAudit(user, module, action, entityId, details);
      }),
    );
  }

  private async writeAudit(
    user: AuthUser,
    module: string,
    action: string,
    entityId: string | null,
    details?: Record<string, unknown>,
  ) {
    try {
      const actor = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true },
      });
      await this.prisma.tenantAudit.create({
        data: {
          userId: user.userId,
          actorName: actor?.name ?? user.email,
          actorEmail: user.email,
          actorRole: user.role,
          companyId: user.companyId,
          module,
          action,
          entityId,
          details: details as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Una falla de auditoría no debe interrumpir la operación del usuario.
      console.error('No se pudo registrar la auditoría de usuario', error);
    }
  }
}
