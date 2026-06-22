import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  isValidSubdomain,
  normalizeSubdomain,
} from '../common/utils/subdomain.util';
import type { MembershipRole } from '../../generated/prisma/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ───────────────────── REGISTRO DE EMPRESA ─────────────────────
  async register(dto: RegisterDto) {
    const subdomain = normalizeSubdomain(dto.subdomain);
    if (!isValidSubdomain(subdomain)) {
      throw new BadRequestException(
        'El subdominio solo puede tener letras, números y guiones (3 a 63 caracteres).',
      );
    }

    // ¿Está reservado por la plataforma?
    const reserved = await this.prisma.reservedSubdomain.findUnique({
      where: { slug: subdomain },
    });
    if (reserved) {
      throw new ConflictException('Ese subdominio está reservado.');
    }

    // ¿Ya lo usa otra empresa?
    const taken = await this.prisma.company.findUnique({
      where: { subdomain },
    });
    if (taken) {
      throw new ConflictException('Ese subdominio ya está en uso.');
    }

    const email = dto.email.toLowerCase().trim();
    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      throw new ConflictException('Ese correo ya está registrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const defaultPlan = await this.prisma.plan.findUnique({
      where: { slug: 'basico' },
    });

    // Todo o nada: empresa + config + usuario + membresía en una transacción.
    const created = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.commercialName,
          subdomain,
          planId: defaultPlan?.id ?? null,
        },
      });

      await tx.companySettings.create({
        data: {
          companyId: company.id,
          storeName: dto.commercialName,
          businessType: dto.businessType ?? null,
          whatsappNumber: dto.whatsappNumber,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.responsibleName,
          email,
          passwordHash,
        },
      });

      await tx.membership.create({
        data: { userId: user.id, companyId: company.id, role: 'OWNER' },
      });

      return { company, user };
    });

    const tokens = await this.issueTokens(
      created.user.id,
      created.user.email,
      created.company.id,
      'OWNER',
    );

    return {
      company: {
        id: created.company.id,
        name: created.company.name,
        subdomain: created.company.subdomain,
      },
      user: {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
      },
      ...tokens,
    };
  }

  // ───────────────────── LOGIN ─────────────────────
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    // Mensaje genérico para no revelar si el correo existe.
    const invalid = new UnauthorizedException('Correo o contraseña incorrectos.');
    if (!user || !user.isActive) throw invalid;

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw invalid;

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException(
        'El usuario no está asociado a ninguna empresa.',
      );
    }

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      membership.companyId,
      membership.role,
    );

    return {
      user: { id: user.id, name: user.name, email: user.email },
      companyId: membership.companyId,
      role: membership.role,
      ...tokens,
    };
  }

  // ───────────────────── REFRESH (con rotación) ─────────────────────
  async refresh(rawToken: string) {
    const parsed = this.parseRefreshToken(rawToken);
    if (!parsed) throw new UnauthorizedException('Refresh token inválido.');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: parsed.id },
      include: { user: { include: { memberships: true } } },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Sesión expirada. Inicia sesión de nuevo.');
    }

    const matches = await bcrypt.compare(parsed.secret, stored.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const membership = stored.user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('El usuario ya no tiene empresa asociada.');
    }

    // Rotación: revoca el actual y emite uno nuevo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      stored.userId,
      stored.user.email,
      membership.companyId,
      membership.role,
    );
  }

  // ───────────────────── LOGOUT ─────────────────────
  async logout(rawToken: string) {
    const parsed = this.parseRefreshToken(rawToken);
    if (!parsed) return { ok: true };
    await this.prisma.refreshToken
      .update({
        where: { id: parsed.id },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined); // si no existe, no pasa nada
    return { ok: true };
  }

  // ───────────────────── HELPERS ─────────────────────

  /** Emite access token (JWT) + refresh token (aleatorio, guardado como hash). */
  private async issueTokens(
    userId: string,
    email: string,
    companyId: string,
    role: MembershipRole,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, companyId, role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: Number(this.config.get('JWT_ACCESS_TTL') ?? 900),
      },
    );

    // Refresh token = "id.secreto". Guardamos solo el hash del secreto.
    const secret = randomBytes(48).toString('hex');
    const tokenHash = await bcrypt.hash(secret, 10);
    const ttl = Number(this.config.get('JWT_REFRESH_TTL') ?? 2592000);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const record = await this.prisma.refreshToken.create({
      data: { id: randomUUID(), userId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: `${record.id}.${secret}`,
      tokenType: 'Bearer',
    };
  }

  private parseRefreshToken(
    raw: string,
  ): { id: string; secret: string } | null {
    const idx = raw.indexOf('.');
    if (idx <= 0) return null;
    return { id: raw.slice(0, idx), secret: raw.slice(idx + 1) };
  }
}
