import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  generateApiKey,
  generateApiToken,
  decryptApiToken,
  COMPANY_SCOPES,
  PLATFORM_SCOPES,
} from './api-token.util';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

const TOKEN_SELECT = {
  id: true,
  apiKey: true,
  name: true,
  scopes: true,
  tokenPrefix: true,
  lastUsedAt: true,
  callsMonth: true,
  monthlyCalls: true,
  createdAt: true,
} as const;

/** Consumo del mes en curso (0 si la última llamada fue de otro mes). */
function withUsage<
  T extends { callsMonth: string | null; monthlyCalls: number },
>(row: T) {
  const { callsMonth, monthlyCalls, ...rest } = row;
  const current = new Date().toISOString().slice(0, 7);
  return { ...rest, monthlyCalls: callsMonth === current ? monthlyCalls : 0 };
}

/**
 * Tokens de API. Los crea siempre el superadmin (nunca el dueño de la tienda):
 * - companyId presente: token para UNA tienda puntual; se le avisa por WhatsApp.
 * - companyId null: token de plataforma, para los propios módulos del superadmin.
 */
@Injectable()
export class ApiTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async create(
    companyId: string | null,
    dto: CreateApiTokenDto,
    validScopes: readonly string[],
  ) {
    const scopes = [...new Set(dto.scopes)];
    const invalid = scopes.filter((s) => !validScopes.includes(s));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Módulo(s) inválido(s): ${invalid.join(', ')}`,
      );
    }
    const { token, prefix, hash, encrypted } = generateApiToken();
    const apiKey = generateApiKey();
    await this.prisma.apiToken.create({
      data: {
        companyId,
        name: dto.name.trim(),
        scopes,
        apiKey,
        tokenHash: hash,
        tokenPrefix: prefix,
        tokenEncrypted: encrypted,
      },
    });
    // token = API Secret (se mantiene el nombre por compatibilidad).
    return { apiKey, apiSecret: token, token, prefix, scopes };
  }

  /** Crea el token para una tienda puntual y le avisa por su WhatsApp registrado. */
  async createForCompany(companyId: string, dto: CreateApiTokenDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        settings: { select: { whatsappNumber: true, storeName: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada.');

    const result = await this.create(companyId, dto, COMPANY_SCOPES);
    const notification = await this.whatsapp.sendApiTokenNotification({
      recipient: company.settings?.whatsappNumber,
      storeName: company.settings?.storeName ?? company.name,
      tokenName: dto.name,
      scopes: result.scopes,
      apiKey: result.apiKey,
      apiSecret: result.apiSecret,
    });
    return { ...result, whatsapp: notification.status };
  }

  async list(companyId: string | null) {
    const rows = await this.prisma.apiToken.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: TOKEN_SELECT,
    });
    return rows.map(withUsage);
  }

  /** Todos los tokens de todas las tiendas, para la vista de administración. */
  async listAllCompanyTokens() {
    const rows = await this.prisma.apiToken.findMany({
      where: { companyId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        ...TOKEN_SELECT,
        company: {
          select: {
            name: true,
            subdomain: true,
            plan: { select: { name: true } },
          },
        },
      },
    });
    return rows.map(({ company, ...row }) => ({
      ...withUsage(row),
      companyName: company?.name ?? null,
      companySubdomain: company?.subdomain ?? null,
      planName: company?.plan?.name ?? null,
    }));
  }

  /** Cambia los módulos permitidos de un token ya creado, sin tener que borrarlo. */
  async updateScopes(id: string, scopes: string[]) {
    const token = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!token) throw new NotFoundException('Token no encontrado.');
    const validScopes: readonly string[] = token.companyId
      ? COMPANY_SCOPES
      : PLATFORM_SCOPES;

    const unique = [...new Set(scopes)];
    if (unique.length === 0) {
      throw new BadRequestException('Selecciona al menos un módulo.');
    }
    const invalid = unique.filter((s) => !validScopes.includes(s));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Módulo(s) inválido(s): ${invalid.join(', ')}`,
      );
    }
    const updated = await this.prisma.apiToken.update({
      where: { id },
      data: { scopes: unique },
      select: TOKEN_SELECT,
    });
    return withUsage(updated);
  }

  /** Vuelve a mostrar el token completo (botón "Ver/Copiar"), en cualquier momento. */
  async reveal(id: string) {
    const token = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!token) throw new NotFoundException('Token no encontrado.');
    if (!token.tokenEncrypted) {
      throw new BadRequestException(
        'Este token es anterior al sistema de recuperación. Revócalo y crea uno nuevo.',
      );
    }
    const secret = decryptApiToken(token.tokenEncrypted);
    return { apiKey: token.apiKey, apiSecret: secret, token: secret };
  }

  /**
   * Genera un API Secret nuevo y conserva la API Key. El secret anterior deja
   * de funcionar al instante (por ejemplo, si se filtró).
   */
  async regenerateSecret(id: string) {
    const current = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Token no encontrado.');
    const { token, prefix, hash, encrypted } = generateApiToken();
    const apiKey = current.apiKey ?? generateApiKey();
    await this.prisma.apiToken.update({
      where: { id },
      data: {
        apiKey,
        tokenHash: hash,
        tokenPrefix: prefix,
        tokenEncrypted: encrypted,
      },
    });
    return { apiKey, apiSecret: token, token };
  }

  /** Revoca y elimina el token por completo: deja de funcionar de inmediato y desaparece de la lista. */
  async revoke(id: string) {
    const token = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!token) throw new NotFoundException('Token no encontrado.');
    await this.prisma.apiToken.delete({ where: { id } });
    return { ok: true };
  }
}
