import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { hashApiToken } from '../api-token.util';
import { API_SCOPE_KEY } from '../decorators/api-scope.decorator';

export interface ApiTokenContext {
  tokenId: string;
  companyId: string | null;
  scopes: string[];
}

/**
 * Autentica peticiones a la API pública (/v1/...) mediante un token `mt_live_...`
 * en el header Authorization: Bearer. Reemplaza al login normal para integraciones externas.
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de API (Authorization: Bearer ...).');
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const record = await this.prisma.apiToken.findUnique({
      where: { tokenHash: hashApiToken(token) },
    });
    if (!record) {
      throw new UnauthorizedException('Token inválido o revocado.');
    }

    const requiredScope = this.reflector.get<string>(API_SCOPE_KEY, context.getHandler());
    const scopes = record.scopes as string[];
    if (requiredScope && !scopes.includes(requiredScope)) {
      throw new ForbiddenException(`Este token no tiene acceso al módulo "${requiredScope}".`);
    }

    request.apiToken = {
      tokenId: record.id,
      companyId: record.companyId,
      scopes,
    } satisfies ApiTokenContext;

    void this.prisma.apiToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }
}
