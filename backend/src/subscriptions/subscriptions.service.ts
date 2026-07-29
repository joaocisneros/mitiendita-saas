import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizePhone } from '../common/utils/phone.util';
import { toTitleCase } from '../common/utils/text.util';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { MediaService } from '../media/media.service';
import { generateSubscriptionCode } from '../common/utils/order-code.util';
import { analyzePaymentProof } from '../common/utils/yape-ocr.util';
import { findDuplicateOperation } from '../common/utils/duplicate-proof.util';

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
  operationNumber: string | null;
  detectedMethod: string | null;
  price: { toString(): string } | null;
  renewalMonths: number | null;
  renewalProofUrl: string | null;
  renewalSubmittedAt: Date | null;
  renewalOperationNumber: string | null;
  renewalDetectedMethod: string | null;
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

    let price: number | null = null;
    if (dto.productId) {
      const owned = await this.prisma.product.findFirst({
        where: { id: dto.productId, companyId: company.id, deletedAt: null },
        select: { id: true, price: true },
      });
      if (!owned) dto.productId = undefined;
      else price = Number(owned.price);
    }

    const customerName = toTitleCase(dto.customerName);
    const customerPhone = normalizePhone(dto.customerPhone);
    // Registrar/actualizar el cliente en la libreta de contactos del negocio (igual que Pedidos).
    const now = new Date();
    await this.prisma.customer.upsert({
      where: { companyId_phone: { companyId: company.id, phone: customerPhone } },
      update: { name: customerName, lastPurchaseAt: now },
      create: {
        companyId: company.id,
        name: customerName,
        phone: customerPhone,
        firstPurchaseAt: now,
        lastPurchaseAt: now,
      },
    });

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
        customerName,
        customerPhone,
        note: dto.note ?? null,
        price,
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

  /** Resuelve id + subdominio a partir del código (para el link corto del recibo). */
  async resolveByCode(code: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { publicCode: code },
      select: { id: true, company: { select: { subdomain: true } } },
    });
    if (!sub) return null;
    return { id: sub.id, subdomain: sub.company.subdomain };
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

    const proofCheck = await analyzePaymentProof(file.buffer);
    if (!proofCheck.looksLikePaymentProof) {
      throw new BadRequestException(
        'La imagen no parece ser un comprobante de Yape o Plin. Sube la captura de pantalla del pago.',
      );
    }
    if (proofCheck.operationNumber && process.env.NODE_ENV === 'production') {
      const isDuplicate = await findDuplicateOperation(this.prisma, company.id, proofCheck.operationNumber, {
        subscriptionId: sub.id,
      });
      if (isDuplicate) {
        throw new BadRequestException(
          'Este comprobante ya fue usado en otro pedido. Si crees que es un error, contáctanos.',
        );
      }
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
        operationNumber: proofCheck.operationNumber,
        detectedMethod: proofCheck.detectedMethod,
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

  /** El cliente pide renovar desde su link público: queda pendiente de aprobar, sin pisar el comprobante original. */
  async submitRenewalProof(
    subdomain: string,
    id: string,
    months: number,
    file: Express.Multer.File,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (company.status !== 'active') {
      throw new ForbiddenException('Esta tienda no está disponible.');
    }
    if (!months || months <= 0) {
      throw new BadRequestException('Elige la duración de la renovación.');
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { id, companyId: company.id },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada.');
    if (sub.status !== 'active') {
      throw new BadRequestException('Esta suscripción todavía no se puede renovar.');
    }

    const proofCheck = await analyzePaymentProof(file.buffer);
    if (!proofCheck.looksLikePaymentProof) {
      throw new BadRequestException(
        'La imagen no parece ser un comprobante de Yape o Plin. Sube la captura de pantalla del pago.',
      );
    }
    if (proofCheck.operationNumber && process.env.NODE_ENV === 'production') {
      const isDuplicate = await findDuplicateOperation(this.prisma, company.id, proofCheck.operationNumber, {
        subscriptionId: sub.id,
      });
      if (isDuplicate) {
        throw new BadRequestException(
          'Este comprobante ya fue usado en otro pedido. Si crees que es un error, contáctanos.',
        );
      }
    }

    const uploaded = await this.media.uploadImage(
      file,
      company.id,
      'subscription-renewal-proofs',
    );

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        renewalMonths: months,
        renewalProofUrl: uploaded.url,
        renewalSubmittedAt: new Date(),
        renewalOperationNumber: proofCheck.operationNumber,
        renewalDetectedMethod: proofCheck.detectedMethod,
      },
    });

    if (sub.renewalProofUrl && sub.renewalProofUrl !== uploaded.url) {
      void this.media.deleteByUrl(sub.renewalProofUrl);
    }

    return this.format(updated);
  }

  /** Aprueba la renovación pedida por el cliente: extiende el vencimiento y limpia el pedido. */
  async approveRenewal(companyId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, companyId },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada.');
    if (!sub.renewalProofUrl || !sub.renewalMonths) {
      throw new BadRequestException('No hay una renovación pendiente para aprobar.');
    }

    const base = sub.endsAt && sub.endsAt.getTime() > Date.now() ? sub.endsAt : new Date();
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'active',
        endsAt: addMonths(base, sub.renewalMonths),
        renewalMonths: null,
        renewalProofUrl: null,
        renewalSubmittedAt: null,
        renewalOperationNumber: null,
        renewalDetectedMethod: null,
      },
    });
    void this.media.deleteByUrl(sub.renewalProofUrl);
    return this.format(updated);
  }

  /** Rechaza el comprobante de renovación: el cliente puede volver a intentarlo. */
  async rejectRenewal(companyId: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, companyId },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada.');
    if (!sub.renewalProofUrl) {
      throw new BadRequestException('No hay una renovación pendiente para rechazar.');
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        renewalMonths: null,
        renewalProofUrl: null,
        renewalSubmittedAt: null,
        renewalOperationNumber: null,
        renewalDetectedMethod: null,
      },
    });
    void this.media.deleteByUrl(sub.renewalProofUrl);
    return this.format(updated);
  }

  /** Lista para el panel, con estado calculado. filter: all|active|expiring|expired|pending|cancelled */
  async listForCompany(companyId: string, filter = 'all') {
    const rows = await this.prisma.subscription.findMany({
      where: { companyId },
      orderBy: [{ createdAt: 'desc' }],
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
    opts: { months?: number; startsAt?: string; endsAt?: string; price?: number } = {},
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
      // Si no venía precio de un producto vinculado, el dueño lo puede ingresar acá.
      if (sub.price == null && opts.price != null) {
        data.price = opts.price;
      }
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

  /** Detalle público de una suscripción, para la página de recibo (sin login). */
  async getPublic(subdomain: string, id: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, company: { subdomain, deletedAt: null } },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada.');
    return this.format(sub);
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
      operationNumber: s.operationNumber,
      detectedMethod: s.detectedMethod,
      price: s.price?.toString() ?? null,
      renewalMonths: s.renewalMonths,
      renewalProofUrl: s.renewalProofUrl,
      renewalSubmittedAt: s.renewalSubmittedAt,
      renewalOperationNumber: s.renewalOperationNumber,
      renewalDetectedMethod: s.renewalDetectedMethod,
      createdAt: s.createdAt,
    };
  }
}
