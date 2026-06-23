import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlatformSettingsDto } from '../dto/settings.dto';
import { SaAuditService } from './sa-audit.service';

/** Configuración global de la plataforma (singleton id=1). */
@Injectable()
export class SaSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SaAuditService,
  ) {}

  get() {
    return this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async update(actorId: string, dto: UpdatePlatformSettingsDto) {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) data[key] = value;
    }
    await this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    await this.audit.log(actorId, 'platform.settings_updated');
    return this.get();
  }
}
