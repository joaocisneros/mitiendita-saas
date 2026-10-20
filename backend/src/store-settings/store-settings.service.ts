import { Injectable, NotFoundException } from '@nestjs/common';
import { planLimitsOf } from '../common/plan/plan-limits';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { normalizePhone } from '../common/utils/phone.util';
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
    return {
      ...settings,
      subdomain: company?.subdomain,
      status: company?.status,
    };
  }

  async planStatus(companyId: string) {
    const [company, limits, platform] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          subscriptionStatus: true,
          currentPeriodEndsAt: true,
          plan: { select: { name: true } },
        },
      }),
      planLimitsOf(this.prisma, companyId),
      this.prisma.platformSettings.findUnique({
        where: { id: 1 },
        select: { supportWhatsapp: true },
      }),
    ]);
    return {
      subscriptionStatus: company?.subscriptionStatus ?? null,
      currentPeriodEndsAt: company?.currentPeriodEndsAt ?? null,
      planName: company?.plan?.name ?? null,
      supportWhatsapp: platform?.supportWhatsapp || null,
      // Lo que incluye su plan: el panel bloquea lo que no.
      limits,
    };
  }

  async update(companyId: string, dto: UpdateSettingsDto) {
    // Imágenes actuales, para borrar las que se reemplacen.
    const current = await this.prisma.companySettings.findUnique({
      where: { companyId },
      select: {
        logoUrl: true,
        yapeQrUrl: true,
        plinQrUrl: true,
        socialImageUrl: true,
      },
    });

    // Sin la función de Google en su plan, el título y la descripción propios no se guardan.
    const { seo } = await planLimitsOf(this.prisma, companyId);
    if (!seo) {
      delete dto.seoTitle;
      delete dto.seoDescription;
    }

    await this.prisma.companySettings.update({
      where: { companyId },
      data: {
        ...dto,
        ...(dto.whatsappNumber !== undefined
          ? { whatsappNumber: normalizePhone(dto.whatsappNumber) || null }
          : {}),
      },
    });

    // Borra el logo / QR anterior si fue reemplazado por uno nuevo.
    if (
      dto.logoUrl !== undefined &&
      current?.logoUrl &&
      current.logoUrl !== dto.logoUrl
    ) {
      void this.media.deleteByUrl(current.logoUrl, companyId);
    }
    if (
      dto.yapeQrUrl !== undefined &&
      current?.yapeQrUrl &&
      current.yapeQrUrl !== dto.yapeQrUrl
    ) {
      void this.media.deleteByUrl(current.yapeQrUrl, companyId);
    }
    if (
      dto.plinQrUrl !== undefined &&
      current?.plinQrUrl &&
      current.plinQrUrl !== dto.plinQrUrl
    ) {
      void this.media.deleteByUrl(current.plinQrUrl, companyId);
    }
    if (
      dto.socialImageUrl !== undefined &&
      current?.socialImageUrl &&
      current.socialImageUrl !== dto.socialImageUrl
    ) {
      void this.media.deleteByUrl(current.socialImageUrl, companyId);
    }
    return this.get(companyId);
  }
}
