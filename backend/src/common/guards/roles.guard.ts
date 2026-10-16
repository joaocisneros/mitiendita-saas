import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { MembershipRole } from '../../../generated/prisma/enums';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Verifica que el usuario autenticado tenga uno de los roles requeridos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MembershipRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    // El superadmin no pertenece a ninguna tienda: para revisar una usa el
    // modo soporte, que emite una sesión propia de esa tienda.
    if (user?.scope === 'super') {
      throw new ForbiddenException(
        'Para ver una tienda entra en modo soporte desde el panel de superadmin.',
      );
    }
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
