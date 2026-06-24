import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class StoreSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async get(companyId: string) {
    const settings = await this.prisma.companySettings.findUnique({
      where: { companyId },
    });
    if (!settings) throw new NotFoundException('Configuración no encontrada.');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { subdomain: true, status: true },
    });
    return { ...settings, subdomain: company?.subdomain, status: company?.status };
  }

  async update(companyId: string, dto: UpdateSettingsDto) {
    // Imágenes actuales, para borrar las que se reemplacen.
    const current = await this.prisma.companySettings.findUnique({
      where: { companyId },
      select: { logoUrl: true, yapeQrUrl: true },
    });

    await this.prisma.companySettings.update({
      where: { companyId },
      data: { ...dto },
    });

    // Borra el logo / QR anterior si fue reemplazado por uno nuevo.
    if (dto.logoUrl !== undefined && current?.logoUrl && current.logoUrl !== dto.logoUrl) {
      void this.media.deleteByUrl(current.logoUrl);
    }
    if (dto.yapeQrUrl !== undefined && current?.yapeQrUrl && current.yapeQrUrl !== dto.yapeQrUrl) {
      void this.media.deleteByUrl(current.yapeQrUrl);
    }
    return this.get(companyId);
  }
}
