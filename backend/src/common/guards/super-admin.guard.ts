import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../decorators/current-user.decorator';

/** Permite el acceso solo a tokens con scope de superadministrador. */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (user?.scope !== 'super') {
      throw new ForbiddenException('Acceso solo para administradores de la plataforma.');
    }
    return true;
  }
}
