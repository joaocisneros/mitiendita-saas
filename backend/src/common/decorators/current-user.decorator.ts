import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Contexto del usuario autenticado, extraído del access token (JWT).
 * El companyId viene SIEMPRE del token, nunca del cliente.
 */
export interface AuthUser {
  userId: string;
  email: string;
  companyId: string;
  role: 'OWNER' | 'EMPLOYEE';
  scope?: 'super';
}

/**
 * Inyecta el usuario autenticado en un controlador:
 *   miMetodo(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
