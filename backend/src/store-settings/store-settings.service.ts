import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.prisma.companySettings.update({
      where: { companyId },
      data: { ...dto },
    });
    return this.get(companyId);
  }
}
