import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Subdominios de sistema que NUNCA son una tienda.
const SYSTEM_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'panel',
  'soporte',
  'status',
  'mail',
]);

/**
 * Resuelve la empresa (tenant) a partir del subdominio del host.
 * Deja el resultado en `req.tenant` para que lo usen las rutas públicas.
 * NO autentica: la autenticación del panel usa el companyId del token.
 */
@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const host = (
      (req.headers['x-forwarded-host'] as string) ||
      req.headers.host ||
      ''
    )
      .toString()
      .split(':')[0]
      .toLowerCase();

    const rootDomain = (
      this.config.get<string>('ROOT_DOMAIN') ?? 'mitiendita.localhost'
    ).toLowerCase();

    const subdomain = this.extractSubdomain(host, rootDomain);

    (req as any).tenant = null;
    (req as any).tenantSubdomain = subdomain;

    if (subdomain && !SYSTEM_SUBDOMAINS.has(subdomain)) {
      const company = await this.prisma.company.findUnique({
        where: { subdomain },
        include: { settings: true },
      });
      if (company) {
        (req as any).tenant = company;
      }
    }

    next();
  }

  /** Extrae "negocio" de "negocio.mitiendita.localhost". */
  private extractSubdomain(host: string, rootDomain: string): string | null {
    if (!host || host === rootDomain) return null;
    const suffix = `.${rootDomain}`;
    if (host.endsWith(suffix)) {
      const label = host.slice(0, -suffix.length);
      // Solo el primer nivel (negocio), ignora niveles extra.
      return label.split('.')[0] || null;
    }
    return null;
  }
}
