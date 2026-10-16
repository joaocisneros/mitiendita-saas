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
  settings: 'store',
  auth: 'profile',
  credits: 'credit',
};

function resolveAudit(path: string, method: string) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'api') parts.shift();
  if (parts[0] === 'admin') parts.shift();
  const root = parts[0];
  if (!root) return null;
  if (root === 'auth' && parts[1] === 'login') return null;
  if (root === 'auth' && parts[1] === 'logout') {
    return { module: 'access', action: 'access.logout' };
  }

  const module = MODULES[root] ?? root.replace(/-/g, '_');
  if (root === 'inventory' && parts.includes('adjust')) {
    return { module, action: 'inventory.adjusted' };
  }
  if (root === 'orders' && parts.includes('status')) {
    return { module, action: 'order.status_updated' };
  }
  if (root === 'appointments' && parts.includes('status')) {
    return { module, action: 'appointment.status_updated' };
  }
  const paymentIndex = parts.indexOf('payment');
  if (paymentIndex >= 0 && parts[paymentIndex + 1]) {
    return { module, action: `${module}.payment_${parts[paymentIndex + 1]}` };
  }
  const operation = ACTIONS[method];
  return operation ? { module, action: `${module}.${operation}` } : null;
}

function safeDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
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
  return entries.length
    ? (Object.fromEntries(entries) as Record<string, unknown>)
    : undefined;
}

@Injectable()
export class TenantAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const user = request.user;
    if (!user || user.scope === 'super' || !user.companyId) {
      return next.handle();
    }

    const path = (request.originalUrl || request.url).split('?')[0];
    const audit = resolveAudit(path, request.method);
    if (!audit) return next.handle();
    const rawEntityId = request.params?.id;
    const entityId = Array.isArray(rawEntityId)
      ? (rawEntityId[0] ?? null)
      : (rawEntityId ?? null);
    const details = safeDetails(request.body);

    return next.handle().pipe(
      tap((response) => {
        const responseData =
          response && typeof response === 'object' && !Array.isArray(response)
            ? (response as Record<string, unknown>)
            : undefined;
        const responseId =
          typeof responseData?.id === 'string' ? responseData.id : null;
        const responseLabel = this.resolveResponseLabel(
          audit.module,
          responseData,
        );
        void this.writeAudit(
          user,
          audit.module,
          audit.action,
          entityId ?? responseId,
          responseLabel ? { ...details, entityLabel: responseLabel } : details,
        );
      }),
    );
  }

  private resolveResponseLabel(
    module: string,
    response?: Record<string, unknown>,
  ) {
    if (!response) return undefined;
    const candidates =
      module === 'order'
        ? [response.publicCode, response.customerName]
        : module === 'appointment'
          ? [response.publicCode, response.serviceName, response.customerName]
          : module === 'subscription'
            ? [response.publicCode, response.planName, response.customerName]
            : module === 'credit'
              ? [response.code, response.fullName]
              : [response.name, response.title, response.storeName];
    return candidates.find(
      (value): value is string =>
        typeof value === 'string' && value.trim() !== '',
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
