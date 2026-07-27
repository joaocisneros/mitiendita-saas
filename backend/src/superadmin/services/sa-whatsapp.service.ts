import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { UpdateWhatsappSettingsDto } from '../dto/whatsapp.dto';
import { SaAuditService } from './sa-audit.service';

/** Integración de WhatsApp (Twilio) de la plataforma, configurable desde Superadmin. */
@Injectable()
export class SaWhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly audit: SaAuditService,
  ) {}

  async get() {
    const s = await this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return {
      enabled: s.whatsappEnabled,
      accountSid: s.twilioAccountSid,
      whatsappFrom: s.twilioWhatsappFrom,
      hasAuthToken: !!s.twilioAuthToken,
    };
  }

  async update(actorId: string, dto: UpdateWhatsappSettingsDto) {
    const data: Record<string, unknown> = {};
    if (dto.enabled !== undefined) data.whatsappEnabled = dto.enabled;
    if (dto.accountSid !== undefined) data.twilioAccountSid = dto.accountSid.trim() || null;
    // El token solo se sobrescribe si mandan uno nuevo no vacío (así el formulario
    // puede guardar los demás campos sin tener que reingresarlo cada vez).
    if (dto.authToken) data.twilioAuthToken = dto.authToken.trim();
    if (dto.whatsappFrom !== undefined) data.twilioWhatsappFrom = dto.whatsappFrom.trim() || null;

    await this.prisma.platformSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    await this.audit.log(actorId, 'platform.whatsapp_updated');
    return this.get();
  }

  sendTest(to: string) {
    return this.whatsapp.sendTestMessage(to);
  }

  /** Dueños de cada tienda (usuario) y su WhatsApp, tal como ya están registrados en el sistema. */
  async listOwners() {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        memberships: {
          where: { role: 'OWNER' },
          take: 1,
          include: { user: { select: { name: true } } },
        },
        settings: { select: { whatsappNumber: true } },
      },
    });
    return companies.map((c) => ({
      companyId: c.id,
      companyName: c.name,
      usuario: c.memberships[0]?.user.name ?? null,
      whatsapp: c.settings?.whatsappNumber ?? null,
    }));
  }

  /** Clientes (nombre y teléfono) del módulo Clientes, de todas las tiendas. */
  async listCustomers() {
    const customers = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { company: { select: { name: true } } },
    });
    return customers.map((c) => ({
      id: c.id,
      cliente: c.name,
      telefono: c.phone,
      companyName: c.company.name,
    }));
  }
}
