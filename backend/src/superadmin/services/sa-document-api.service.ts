import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  decryptApiToken,
  encryptApiToken,
} from '../../api-tokens/api-token.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TestDocumentApiConfigDto,
  UpdateDocumentApiConfigDto,
} from '../dto/document-api.dto';
import { SaAuditService } from './sa-audit.service';

type ProviderResponse<T> = {
  success?: boolean;
  data?: T | null;
  message?: string | null;
};

@Injectable()
export class SaDocumentApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SaAuditService,
  ) {}

  async config() {
    const config = await this.prisma.documentApiConfig.findUnique({
      where: { id: 1 },
    });
    return {
      provider: 'CismaFact',
      configured: Boolean(config),
      enabled: config?.enabled ?? false,
      apiKeyMasked: config ? `••••••••${config.apiKeyLastFour}` : null,
      updatedAt: config?.updatedAt ?? null,
    };
  }

  async updateConfig(actorId: string, dto: UpdateDocumentApiConfigDto) {
    const apiKey = dto.apiKey?.trim();
    const existing = await this.prisma.documentApiConfig.findUnique({
      where: { id: 1 },
    });
    if ((!apiKey || !dto.apiSecret?.trim()) && !existing) {
      throw new BadRequestException(
        'Ingresa la API Key y el API Secret para completar la configuración.',
      );
    }
    await this.prisma.documentApiConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        apiKeyEncrypted: encryptApiToken(apiKey!),
        apiSecretEncrypted: encryptApiToken(dto.apiSecret!.trim()),
        apiKeyLastFour: apiKey!.slice(-4),
        enabled: dto.enabled,
      },
      update: {
        enabled: dto.enabled,
        ...(apiKey
          ? {
              apiKeyEncrypted: encryptApiToken(apiKey),
              apiKeyLastFour: apiKey.slice(-4),
            }
          : {}),
        ...(dto.apiSecret?.trim()
          ? { apiSecretEncrypted: encryptApiToken(dto.apiSecret.trim()) }
          : {}),
      },
    });
    await this.audit.log(
      actorId,
      'document_api.configuration_updated',
      undefined,
      {
        provider: 'CismaFact',
        enabled: dto.enabled,
      },
    );
    return this.config();
  }

  async test(actorId: string, dto: TestDocumentApiConfigDto) {
    const apiKey = dto.apiKey?.trim();
    const apiSecret = dto.apiSecret?.trim();
    if (Boolean(apiKey) !== Boolean(apiSecret)) {
      throw new BadRequestException(
        'Para probar credenciales nuevas, ingresa la API Key y el API Secret.',
      );
    }
    const quota = await this.request<Record<string, unknown>>(
      '/consultas/cuota',
      apiKey && apiSecret ? { apiKey, apiSecret } : undefined,
    );
    await this.audit.log(actorId, 'document_api.connection_tested');
    return { ok: true, message: 'Conexión establecida correctamente.', quota };
  }

  quota() {
    return this.request<Record<string, unknown>>('/consultas/cuota');
  }

  async consult(actorId: string, type: 'ruc' | 'dni', rawNumber: string) {
    const number = rawNumber.replace(/\D/g, '');
    const expected = type === 'ruc' ? 11 : 8;
    if (number.length !== expected) {
      throw new BadRequestException(
        `El ${type.toUpperCase()} debe tener ${expected} dígitos.`,
      );
    }
    const data = await this.request<Record<string, unknown>>(
      `/consultas/${type}/${number}`,
    );
    await this.audit.log(actorId, `document_api.${type}_consulted`, undefined, {
      document: `${'*'.repeat(expected - 4)}${number.slice(-4)}`,
    });
    return data;
  }

  private async request<T>(
    path: string,
    temporaryCredentials?: { apiKey: string; apiSecret: string },
  ): Promise<T> {
    const config = await this.prisma.documentApiConfig.findUnique({
      where: { id: 1 },
    });
    if (!temporaryCredentials && (!config || !config.enabled)) {
      throw new ServiceUnavailableException(
        'Configura y activa primero la conexión con CismaFact.',
      );
    }
    const apiKey =
      temporaryCredentials?.apiKey ?? decryptApiToken(config!.apiKeyEncrypted);
    const apiSecret =
      temporaryCredentials?.apiSecret ??
      decryptApiToken(config!.apiSecretEncrypted);
    const baseUrl = config?.baseUrl ?? 'https://cismafact.alwaysdata.net/api';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        headers: {
          'X-Api-Key': apiKey,
          'X-Api-Secret': apiSecret,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new BadGatewayException(
        'No se pudo establecer conexión con CismaFact.',
      );
    }
    const body = (await response.json().catch(() => null)) as
      | ProviderResponse<T>
      | T
      | null;
    const envelope = body as ProviderResponse<T> | null;
    if (!response.ok || envelope?.success === false) {
      throw new BadGatewayException(
        envelope?.message ||
          `CismaFact respondió con error ${response.status}.`,
      );
    }
    if (envelope?.success === true) {
      if (!envelope.data) {
        throw new BadGatewayException(
          envelope.message || 'La consulta no devolvió información disponible.',
        );
      }
      return envelope.data;
    }
    if (!body)
      throw new BadGatewayException('CismaFact devolvió una respuesta vacía.');
    return body as T;
  }
}
