import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/** Contraseñas de ejemplo que nunca deben servir como llave de emergencia. */
const WEAK_PASSWORDS = new Set([
  'Admin12345',
  'CAMBIA_ESTO',
  'change-me',
  'pon_aqui_un_secreto_fuerte',
]);

/** Comparación en tiempo constante (no revela cuántos caracteres coinciden). */
function sameSecret(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

@Injectable()
export class SaAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: normalizedEmail },
    });
    const invalid = new UnauthorizedException('Credenciales incorrectas.');
    if (!admin || !admin.isActive) throw invalid;
    let ok = await bcrypt.compare(password, admin.passwordHash);

    // Recuperación segura ante un hash desincronizado después de un despliegue.
    // Solo funciona cuando correo y contraseña coinciden exactamente con los
    // secretos privados SUPERADMIN_* configurados en el servidor.
    if (!ok && this.matchesRecoveryCredentials(normalizedEmail, password)) {
      const passwordHash = await bcrypt.hash(password, 12);
      await this.prisma.superAdmin.update({
        where: { id: admin.id },
        data: { passwordHash, isActive: true },
      });
      ok = true;
      console.warn(
        `[superadmin] Acceso con la llave de emergencia (${admin.email}). Desactiva SUPERADMIN_RECOVERY cuando termines.`,
      );
    }
    if (!ok) throw invalid;

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, scope: 'super' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 60 * 60 * 8,
      },
    );
    return {
      accessToken,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    };
  }

  /**
   * La recuperación por variables de entorno es una llave de emergencia:
   * solo funciona si SUPERADMIN_RECOVERY=true y con una contraseña fuerte.
   * Apagada, cambiar la contraseña desde el panel invalida la del servidor.
   */
  private matchesRecoveryCredentials(email: string, password: string) {
    if (this.config.get<string>('SUPERADMIN_RECOVERY') !== 'true') {
      return false;
    }
    const recoveryEmail = this.config
      .get<string>('SUPERADMIN_EMAIL')
      ?.trim()
      .toLowerCase();
    const recoveryPassword = this.config.get<string>('SUPERADMIN_PASSWORD');
    if (
      !recoveryEmail ||
      !recoveryPassword ||
      recoveryPassword.length < 12 ||
      WEAK_PASSWORDS.has(recoveryPassword)
    ) {
      return false;
    }
    return email === recoveryEmail && sameSecret(password, recoveryPassword);
  }

  /**
   * Edita el propio perfil del superadmin: nombre y/o contraseña.
   * El correo no se cambia aquí. Para cambiar la clave, valida la actual.
   */
  async updateProfile(
    adminId: string,
    dto: { name?: string; currentPassword?: string; newPassword?: string },
  ) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new UnauthorizedException('Administrador no encontrado.');

    const data: { name?: string; passwordHash?: string } = {};
    if (dto.name && dto.name.trim() !== admin.name) {
      data.name = dto.name.trim();
    }
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Ingresa tu contraseña actual para cambiarla.',
        );
      }
      const ok = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
      if (!ok)
        throw new BadRequestException('La contraseña actual no es correcta.');
      data.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }
    if (Object.keys(data).length === 0) {
      return { id: admin.id, name: admin.name, email: admin.email };
    }
    const updated = await this.prisma.superAdmin.update({
      where: { id: adminId },
      data,
    });
    return { id: updated.id, name: updated.name, email: updated.email };
  }
}
