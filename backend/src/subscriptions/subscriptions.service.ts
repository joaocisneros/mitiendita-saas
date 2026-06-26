import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizePhone } from '../common/utils/phone.util';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { MediaService } from '../media/media.service';
import { generateSubscriptionCode } from '../common/utils/order-code.util';

const DAY = 86_400_000;
const EXPIRING_DAYS = 7; // "por vencer" si vence en 7 días o menos

/** Suma meses de calendario reales (ej. 31 ene + 1 mes → 28/29 feb). */
function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Si el mes destino no tiene ese día, JS desborda al siguiente mes: lo corregimos.
  if (d.getDate() < day) d.setDate(0);
  return d;
}

type SubRow = {
  id: string;
  publicCode: string | null;
  planName: string;
  customerName: string;
  customerPhone: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  note: string | null;
  proofUrl: string | null;
  proofSubmittedAt: Date | null;
  createdAt: Date;
};

/** Estado calculado a partir del status y la fecha de vencimiento. */
function computeState(status: string, endsAt: Date | null) {
  if (status === 'cancelled') return { state: 'cancelled' as const, daysLeft: null };
  if (status === 'pending') return { state: 'pending' as const, daysLeft: null };
  if (!endsAt) return { state: 'active' as const, daysLeft: null };
  const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / DAY);
  if (daysLeft < 0) return { state: 'expired' as const, daysLeft };
  if (daysLeft <= EXPIRING_DAYS) return { state: 'expiring' as const, daysLeft };
  return { state: 'active' as const, daysLeft };
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly media: MediaService,
  ) {}

  /** Suscripción pública a un plan. Queda "pendiente" hasta que el dueño la activa. */
  async create(subdomain: string, dto: CreateSubscriptionDto) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (company.status !== 'active') {
      throw new ForbiddenException('Esta tienda no está disponible.');
    }

    if (dto.productId) {
      const owned = await this.prisma.product.findFirst({
        where: { id: dto.productId, companyId: company.id, deletedAt: null },
        select: { id: true },
      });
      if (!owned) dto.productId = undefined;
    }

    let publicCode = generateSubscriptionCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.subscription.findUnique({
        where: { publicCode },
        select: { id: true },
      });
      if (!exists) break;
      publicCode = generateSubscriptionCode();
    }

    const sub = await this.prisma.subscription.create({
      data: {
        companyId: company.id,
        productId: dto.productId ?? null,
        publicCode,
        planName: dto.planName,
        customerName: dto.customerName,
        customerPhone: normalizePhone(dto.customerPhone),
        note: dto.note ?? null,
      },
    });

    void this.whatsapp.sendSubscriptionNotification({
      recipient: company.settings?.whatsappNumber,
      storeName: company.settings?.storeName || company.name,
      planName: sub.planName,
      customerName: sub.customerName,
      customerPhone: sub.customerPhone,
    });

    return this.format(sub);
  }

  /** Devuelve la URL del comprobante de una suscripción por su código corto. */
  async getProofUrlByCode(code: string): Promise<string | null> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        OR: [{ publicCode: code }, { id: code }],
      },
      select: { proofUrl: true },
    });
    return sub?.proofUrl ?? null;
  }

  /** El cliente sube su comprobante Yape para una suscripción digital. */
  async submitProof(
    subdomain: string,
    id: string,
    file: Express.Multer.File,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (company.status !== 'active') {
      throw new ForbiddenException('Esta tienda no está disponible.');
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { id, companyId: company.id },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada.');
    if (sub.status === 'cancelled') {
      throw new BadRequestException('Esta suscripción ya no admite comprobantes.');
    }

    const uploaded = await this.media.uploadImage(
      file,
      company.id,
      'subscription-proofs',
    );

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        proofUrl: uploaded.url,
        proofSubmittedAt: new Date(),
      },
    });

    if (sub.proofUrl && sub.proofUrl !== uploaded.url) {
      void this.media.deleteByUrl(sub.proofUrl);
    }

    const whatsappNotification =
      await this.whatsapp.sendSubscriptionProofNotification({
        recipient: company.settings?.whatsappNumber,
        storeName: company.settings?.storeName || company.name,
        planName: updated.planName,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        proofUrl: uploaded.url,
      });

    return { ...this.format(updated), whatsappNotification };
  }

  /** Lista para el panel, con estado calculado. filter: all|active|expiring|expired|pending|cancelled */
  async listForCompany(companyId: string, filter = 'all') {
    const rows = await this.prisma.subscription.findMany({
      where: { companyId },
      orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
      take: 300,
    });
    const mapped = rows.map((s) => this.format(s));
    if (filter && filter !== 'all') {
      return mapped.filter((m) => m.state === filter);
    }
    return mapped;
  }

  /** Resumen rápido para el dashboard (cuántas por vencer / vencidas / activas). */
  async summary(companyId: string) {
    const rows = await this.prisma.subscription.findMany({
      where: { companyId, status: 'active' },
      select: { status: true, endsAt: true },
    });
    let active = 0;
    let expiring = 0;
    let expired = 0;
    for (const r of rows) {
      const { state } = computeState(r.status, r.endsAt);
      if (state === 'expiring') expiring++;
      else if (state === 'expired') expired++;
      else active++;
    }
    return { active, expiring, expired };
  }

  /** Acción del dueño: activar / renovar / cancelar. */
  async updateAction(
    companyId: string,
    id: string,
    action: 'activate' | 'renew' | 'cancel' | 'edit',
    opts: { months?: number; startsAt?: string; endsAt?: string } = {},
  ) {
    const months = opts.months ?? 1;
    const sub = await this.prisma.subscription.findFirst({
      where: { id, companyId },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada.');

    let data: Record<string, unknown>;
    if (action === 'cancel') {
      data = { status: 'cancelled' };
    } else if (action === 'edit') {
      // Fija manualmente inicio/vencimiento.
      if (!opts.endsAt) {
        throw new BadRequestException('Indica la fecha de vencimiento.');
      }
      const start = opts.startsAt ? new Date(opts.startsAt) : (sub.startsAt ?? new Date());
      const end = new Date(opts.endsAt);
      if (end.getTime() <= start.getTime()) {
        throw new BadRequestException('El vencimiento debe ser posterior al inicio.');
      }
      data = { status: 'active', startsAt: start, endsAt: end };
    } else if (action === 'activate') {
      const now = new Date();
      data = {
        status: 'active',
        startsAt: now,
        endsAt: addMonths(now, months),
      };
    } else {
      // renew: extiende desde la fecha de vencimiento actual (o desde hoy si ya venció).
      if (sub.status === 'cancelled') {
        throw new BadRequestException('No se puede renovar una suscripción cancelada.');
      }
      const base = sub.endsAt && sub.endsAt.getTime() > Date.now() ? sub.endsAt : new Date();
      data = {
        status: 'active',
        startsAt: sub.startsAt ?? new Date(),
        endsAt: addMonths(base, months),
      };
    }

    const updated = await this.prisma.subscription.update({ where: { id }, data });
    return this.format(updated);
  }

  private format(s: SubRow) {
    const { state, daysLeft } = computeState(s.status, s.endsAt);
    return {
      id: s.id,
      publicCode: s.publicCode,
      planName: s.planName,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      status: s.status,
      state, // pending | active | expiring | expired | cancelled
      daysLeft,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      note: s.note,
      proofUrl: s.proofUrl,
      proofSubmittedAt: s.proofSubmittedAt,
      createdAt: s.createdAt,
    };
  }
}
