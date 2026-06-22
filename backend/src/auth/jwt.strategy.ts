import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  role: 'OWNER' | 'EMPLOYEE';
  scope?: 'super';
}

/**
 * Valida el access token y construye el contexto del usuario.
 * El companyId proviene del token firmado: el cliente NO puede falsificarlo.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me',
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      role: payload.role,
      scope: payload.scope,
    };
  }
}
