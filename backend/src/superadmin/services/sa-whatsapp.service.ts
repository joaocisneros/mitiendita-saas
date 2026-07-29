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

  /**
   * Dueños + clientes combinados en un solo directorio: si el mismo número aparece
   * como dueño en una tienda y cliente en otra, se fusiona en una fila con ambos roles.
   * Búsqueda, filtro por rol y paginación se resuelven acá, no en el navegador.
   */
  async listDirectory(opts: { search?: string; role?: 'Dueño' | 'Cliente' | 'all'; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

    const [companies, customers] = await Promise.all([
      this.prisma.company.findMany({
        where: { deletedAt: null },
        include: {
          memberships: { where: { role: 'OWNER' }, take: 1, include: { user: { select: { name: true } } } },
          settings: { select: { whatsappNumber: true } },
        },
      }),
      this.prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2000,
        include: { company: { select: { name: true } } },
      }),
    ]);

    type Role = 'Dueño' | 'Cliente';
    type Row = { id: string; nombres: string[]; telefono: string | null; roles: Role[]; empresas: string[] };

    const groups = new Map<string, Row>();
    const withoutPhone: Row[] = [];
    let anonId = 0;

    const addEntry = (rol: Role, nombre: string, telefono: string | null, empresa: string) => {
      const digits = telefono?.replace(/\D+/g, '') ?? '';
      if (!digits) {
        withoutPhone.push({ id: `sin-numero-${anonId++}`, nombres: [nombre], telefono, roles: [rol], empresas: [empresa] });
        return;
      }
      const existing = groups.get(digits);
      if (!existing) {
        groups.set(digits, { id: digits, nombres: [nombre], telefono, roles: [rol], empresas: [empresa] });
        return;
      }
      if (!existing.nombres.includes(nombre)) existing.nombres.push(nombre);
      if (!existing.roles.includes(rol)) existing.roles.push(rol);
      if (!existing.empresas.includes(empresa)) existing.empresas.push(empresa);
    };

    for (const c of companies) {
      addEntry('Dueño', c.memberships[0]?.user.name ?? 'Sin usuario', c.settings?.whatsappNumber ?? null, c.name);
    }
    for (const cu of customers) {
      addEntry('Cliente', cu.name, cu.phone, cu.company.name);
    }

    let all = [...groups.values(), ...withoutPhone].sort((a, b) => a.nombres[0].localeCompare(b.nombres[0]));

    if (opts.role && opts.role !== 'all') {
      all = all.filter((r) => r.roles.includes(opts.role as Role));
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim().toLowerCase();
      all = all.filter(
        (r) =>
          r.nombres.some((n) => n.toLowerCase().includes(q)) ||
          r.empresas.some((e) => e.toLowerCase().includes(q)) ||
          (r.telefono ?? '').toLowerCase().includes(q),
      );
    }

    const total = all.length;
    const start = (page - 1) * limit;
    return {
      items: all.slice(start, start + limit),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
