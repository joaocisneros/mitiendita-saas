import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { timingSafeEqual } from 'crypto';
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
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      apiToken?: ApiTokenContext;
    }>();
    const header = (name: string) => {
      const value = request.headers[name];
      return (Array.isArray(value) ? value[0] : value)?.trim() || '';
    };
    const include = {
      company: { select: { status: true, deletedAt: true } },
    } as const;

    const apiKey = header('x-api-key');
    const apiSecret = header('x-api-secret');
    const authHeader = header('authorization');
    let record;
    if (apiKey || apiSecret) {
      // Forma principal: X-Api-Key identifica, X-Api-Secret lo comprueba.
      if (!apiKey || !apiSecret) {
        throw new UnauthorizedException(
          'Envía los dos encabezados: X-Api-Key y X-Api-Secret.',
        );
      }
      record = await this.prisma.apiToken.findUnique({
        where: { apiKey },
        include,
      });
      const expected = Buffer.from(record?.tokenHash ?? '');
      const given = Buffer.from(hashApiToken(apiSecret));
      if (
        !record ||
        expected.length !== given.length ||
        !timingSafeEqual(expected, given)
      ) {
        throw new UnauthorizedException('API Key o API Secret inválidos.');
      }
    } else if (authHeader.startsWith('Bearer ')) {
      // Compatibilidad: Authorization: Bearer <secret>.
      const token = authHeader.slice('Bearer '.length).trim();
      record = await this.prisma.apiToken.findUnique({
        where: { tokenHash: hashApiToken(token) },
        include,
      });
      if (!record) {
        throw new UnauthorizedException('Token inválido o revocado.');
      }
    } else {
      throw new UnauthorizedException(
        'Faltan las credenciales: envía X-Api-Key y X-Api-Secret.',
      );
    }
    if (
      record.companyId &&
      (!record.company ||
        record.company.status !== 'active' ||
        record.company.deletedAt)
    ) {
      throw new ForbiddenException(
        'La empresa asociada al token no está activa.',
      );
    }

    const requiredScope = this.reflector.get<string>(
      API_SCOPE_KEY,
      context.getHandler(),
    );
    const scopes = record.scopes as string[];
    if (requiredScope && !scopes.includes(requiredScope)) {
      throw new ForbiddenException(
        `Este token no tiene acceso al módulo "${requiredScope}".`,
      );
    }

    request.apiToken = {
      tokenId: record.id,
      companyId: record.companyId,
      scopes,
    } satisfies ApiTokenContext;

    // Último uso + consumo del mes (MySQL asigna en orden: primero compara el
    // mes guardado y luego lo actualiza). Si falla, no deja un error suelto.
    const month = new Date().toISOString().slice(0, 7);
    void this.prisma.$executeRaw`
      UPDATE api_tokens
      SET last_used_at = NOW(3),
          monthly_calls = IF(calls_month = ${month}, monthly_calls + 1, 1),
          calls_month = ${month}
      WHERE id = ${record.id}`.catch(() => undefined);

    return true;
  }
}
