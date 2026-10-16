import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BUYER_CUSTOMER } from '../../common/utils/valid-order.util';
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
    if (dto.accountSid !== undefined)
      data.twilioAccountSid = dto.accountSid.trim() || null;
    // El token solo se sobrescribe si mandan uno nuevo no vacío (así el formulario
    // puede guardar los demás campos sin tener que reingresarlo cada vez).
    if (dto.authToken) data.twilioAuthToken = dto.authToken.trim();
    if (dto.whatsappFrom !== undefined)
      data.twilioWhatsappFrom = dto.whatsappFrom.trim() || null;

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
      where: BUYER_CUSTOMER,
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

  /** Directorio global consolidado: una fila por número válido. */
  async listDirectory(opts: {
    search?: string;
    role?: 'Dueño' | 'Cliente' | 'all';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

    const [companies, customers] = await Promise.all([
      this.prisma.company.findMany({
        where: { deletedAt: null },
        include: {
          memberships: {
            where: { role: 'OWNER' },
            take: 1,
            include: { user: { select: { name: true } } },
          },
          settings: { select: { whatsappNumber: true } },
        },
      }),
      this.prisma.customer.findMany({
        where: BUYER_CUSTOMER,
        orderBy: { createdAt: 'desc' },
        take: 2000,
        include: { company: { select: { name: true } } },
      }),
    ]);

    type Role = 'Dueño' | 'Cliente' | 'Dueño y cliente';
    type Status =
      | 'available'
      | 'incomplete'
      | 'missing'
      | 'name_review'
      | 'duplicate';
    type Row = {
      id: string;
      nombre: string;
      telefono: string | null;
      rol: Role;
      empresa: string;
      companyId: string;
      status: Status;
      duplicateNames: string[];
    };
    const normalizePeruvianPhone = (phone: string | null) => {
      const digits = phone?.replace(/\D+/g, '') ?? '';
      if (/^9\d{8}$/.test(digits)) return `51${digits}`;
      if (/^519\d{8}$/.test(digits)) return digits;
      return null;
    };
    const hasReviewableName = (name: string) => {
      const clean = name.trim();
      return clean.length >= 3 && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(clean);
    };
    let all: Row[] = [
      ...companies.map<Row>((company) => ({
        id: `owner:${company.id}`,
        nombre: company.memberships[0]?.user.name ?? 'Sin usuario asignado',
        telefono: company.settings?.whatsappNumber ?? null,
        rol: 'Dueño',
        empresa: company.name,
        companyId: company.id,
        status: 'available',
        duplicateNames: [],
      })),
      ...customers.map<Row>((customer) => ({
        id: `customer:${customer.id}`,
        nombre: customer.name,
        telefono: customer.phone,
        rol: 'Cliente',
        empresa: customer.company.name,
        companyId: customer.companyId,
        status: 'available',
        duplicateNames: [],
      })),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    for (const row of all) {
      const digits = row.telefono?.replace(/\D+/g, '') ?? '';
      const normalized = normalizePeruvianPhone(row.telefono);
      if (!digits) {
        row.status = 'missing';
      } else if (!normalized) {
        row.status = 'incomplete';
      } else if (!hasReviewableName(row.nombre)) {
        row.status = 'name_review';
      }
    }

    // El directorio del superadministrador es global: consolida un número válido
    // en una sola fila, conserva todas sus empresas y elige el nombre más completo.
    const nameScore = (name: string) => {
      const clean = name.trim();
      const words = clean.split(/\s+/).filter(Boolean).length;
      const letters = (clean.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length;
      return (hasReviewableName(clean) ? 1000 : 0) + words * 100 + letters;
    };
    const consolidated = new Map<string, Row[]>();
    const ungrouped: Row[] = [];
    for (const row of all) {
      const normalized = normalizePeruvianPhone(row.telefono);
      if (!normalized) {
        ungrouped.push(row);
        continue;
      }
      consolidated.set(normalized, [
        ...(consolidated.get(normalized) ?? []),
        row,
      ]);
    }
    all = [
      ...ungrouped,
      ...[...consolidated.entries()].map(([phone, matches]) => {
        const best = [...matches].sort(
          (a, b) => nameScore(b.nombre) - nameScore(a.nombre),
        )[0];
        const companies = [...new Set(matches.map((item) => item.empresa))];
        const roles = new Set(matches.map((item) => item.rol));
        const role: Role =
          roles.has('Dueño') && roles.has('Cliente')
            ? 'Dueño y cliente'
            : best.rol;
        const merged: Row = {
          ...best,
          id: `phone:${phone}`,
          telefono: phone,
          rol: role,
          empresa: companies.join(', '),
          status: hasReviewableName(best.nombre) ? 'available' : 'name_review',
          duplicateNames: [
            ...new Set(
              matches
                .map((item) => item.nombre.trim())
                .filter(
                  (name) =>
                    name.toLocaleLowerCase() !==
                    best.nombre.trim().toLocaleLowerCase(),
                ),
            ),
          ],
        };
        return merged;
      }),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const summary = {
      total: all.length,
      owners: all.filter((row) => row.rol.includes('Dueño')).length,
      customers: all.filter((row) => row.rol.includes('Cliente')).length,
      available: all.filter((row) => row.status === 'available').length,
      needsReview: all.filter((row) => row.status !== 'available').length,
    };

    if (opts.role && opts.role !== 'all') {
      all = all.filter((r) => r.rol.includes(opts.role as 'Dueño' | 'Cliente'));
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim().toLowerCase();
      all = all.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          r.empresa.toLowerCase().includes(q) ||
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
      summary,
    };
  }
}
