import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  companyId?: string;
  role?: 'OWNER' | 'EMPLOYEE';
  scope?: 'super';
}

/** Valida firma, expiración y estado actual de la cuenta en cada petición. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.scope === 'super') {
      const admin = await this.prisma.superAdmin.findFirst({
        where: { id: payload.sub, email: payload.email, isActive: true },
        select: { id: true },
      });
      if (!admin) throw new UnauthorizedException('La sesión ya no es válida.');
      return {
        userId: payload.sub,
        email: payload.email,
        companyId: '',
        role: 'OWNER',
        scope: 'super',
      };
    }

    if (!payload.companyId || !payload.role) {
      throw new UnauthorizedException('Token de sesión inválido.');
    }
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: payload.sub,
          companyId: payload.companyId,
        },
      },
      include: {
        user: { select: { email: true, isActive: true } },
        company: { select: { status: true, deletedAt: true } },
      },
    });
    if (
      !membership ||
      !membership.user.isActive ||
      membership.user.email !== payload.email ||
      membership.company.status !== 'active' ||
      membership.company.deletedAt
    ) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      role: membership.role,
    };
  }
}
