import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { normalizePhone } from '../common/utils/phone.util';
import { generateOrderCode } from '../common/utils/order-code.util';
import { CheckoutDto } from './dto/checkout.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /**
   * Crea un pedido como invitado (checkout público).
   * Todo el cálculo de importes y stock ocurre en el servidor:
   * los precios que envía el navegador NUNCA se consideran confiables.
   */
  async checkout(
    subdomain: string,
    dto: CheckoutDto,
    idempotencyKey?: string,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (company.status !== 'active') {
      throw new ForbiddenException('Esta tienda no está disponible.');
    }
    const settings = company.settings;

    // Idempotencia: si ya existe un pedido con esta clave, lo devolvemos.
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: {
          companyId_idempotencyKey: {
            companyId: company.id,
            idempotencyKey,
          },
        },
        include: { items: true, payment: true },
      });
      if (existing) return this.format(existing, settings?.currency ?? 'PEN');
    }

    // Validar método de entrega.
    const isDelivery = dto.deliveryMethod === 'delivery';
    if (isDelivery && settings && !settings.allowsDelivery) {
      throw new BadRequestException('Esta tienda no ofrece delivery.');
    }
    if (!isDelivery && settings && !settings.allowsPickup) {
      throw new BadRequestException('Esta tienda no ofrece recojo.');
    }
    if (isDelivery && !dto.address) {
      throw new BadRequestException('La dirección es obligatoria para delivery.');
    }

    // Releer productos reales desde la BD.
    const ids = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, companyId: company.id, deletedAt: null, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Construir líneas con copia histórica y recalcular importes.
    const lines = dto.items.map((item) => {
      const p = byId.get(item.productId);
      if (!p) {
        throw new BadRequestException(
          'Uno de los productos ya no está disponible.',
        );
      }
      const unitPrice = Number(p.price);
      const lineTotal = round2(unitPrice * item.quantity);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const deliveryFee = isDelivery ? Number(settings?.deliveryFee ?? 0) : 0;

    if (isDelivery && settings?.minOrder && subtotal < Number(settings.minOrder)) {
      throw new BadRequestException(
        `El pedido mínimo para delivery es ${Number(settings.minOrder).toFixed(2)}.`,
      );
    }

    const total = round2(subtotal + deliveryFee);
    const currency = settings?.currency ?? 'PEN';
    const phone = normalizePhone(dto.customerPhone);

    const reservationMinutes = Number(process.env.RESERVATION_MINUTES ?? 30);
    const reservationExpiresAt = new Date(
      Date.now() + reservationMinutes * 60_000,
    );

    // ── Transacción: cliente + reserva de stock + pedido + pago ──
    const order = await this.prisma.$transaction(async (tx) => {
      // 1) Crear o actualizar al cliente.
      const now = new Date();
      const customer = await tx.customer.upsert({
        where: { companyId_phone: { companyId: company.id, phone } },
        update: {
          name: dto.customerName,
          address: dto.address ?? undefined,
          lastPurchaseAt: now,
        },
        create: {
          companyId: company.id,
          name: dto.customerName,
          phone,
          address: dto.address ?? null,
          firstPurchaseAt: now,
          lastPurchaseAt: now,
        },
      });

      // 2) Reservar stock de forma atómica (previene sobreventa).
      for (const line of lines) {
        const affected = await tx.$executeRaw`
          UPDATE products
          SET reserved = reserved + ${line.quantity}
          WHERE id = ${line.productId}
            AND company_id = ${company.id}
            AND deleted_at IS NULL
            AND is_active = 1
            AND (stock - reserved) >= ${line.quantity}`;
        if (affected === 0) {
          throw new ConflictException(
            `Stock insuficiente para "${line.name}".`,
          );
        }
      }

      // 3) Código público único.
      let publicCode = generateOrderCode();
      for (let i = 0; i < 5; i++) {
        const clash = await tx.order.findUnique({ where: { publicCode } });
        if (!clash) break;
        publicCode = generateOrderCode();
      }

      // 4) Crear el pedido con sus líneas (copia histórica).
      const created = await tx.order.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          publicCode,
          status: 'pending',
          paymentStatus: 'pending',
          deliveryMethod: dto.deliveryMethod,
          customerName: dto.customerName,
          customerPhone: phone,
          address: dto.address ?? null,
          reference: dto.reference ?? null,
          customerNote: dto.customerNote ?? null,
          subtotal,
          deliveryFee,
          total,
          currency,
          idempotencyKey: idempotencyKey ?? null,
          reservationExpiresAt,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              name: l.name,
              sku: l.sku,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
            })),
          },
          payment: {
            create: {
              companyId: company.id,
              method: 'yape',
              expectedAmount: total,
              status: 'pending',
            },
          },
          history: {
            create: { fromStatus: null, toStatus: 'pending' },
          },
        },
        include: { items: true, payment: true },
      });

      return created;
    });

    return this.format(order, currency);
  }

  /** Estado público del pedido por su código (para la página de seguimiento). */
  async getByCode(subdomain: string, code: string) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      select: { id: true, settings: { select: { currency: true } } },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');

    const order = await this.prisma.order.findFirst({
      where: { companyId: company.id, publicCode: code },
      include: { items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return this.format(order, company.settings?.currency ?? 'PEN');
  }

  /**
   * El cliente sube su comprobante de pago Yape.
   * Pausa la expiración de la reserva (decisión: el comprobante "congela"
   * el pedido hasta que el dueño valide).
   */
  async submitProof(
    subdomain: string,
    code: string,
    file: Express.Multer.File,
    reportedAmount?: number,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');

    const order = await this.prisma.order.findFirst({
      where: { companyId: company.id, publicCode: code },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (order.status === 'cancelled' || order.status === 'expired') {
      throw new BadRequestException('Este pedido ya no admite pagos.');
    }

    const uploaded = await this.media.uploadImage(file, company.id, 'proofs');

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId: order.id },
        data: {
          proofUrl: uploaded.url,
          reportedAmount: reportedAmount ?? null,
          status: 'proof_submitted',
          submittedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        // Pausar expiración: el pedido ya no vence mientras se valida el pago.
        data: { paymentStatus: 'proof_submitted', reservationExpiresAt: null },
      }),
    ]);

    const updated = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, payment: true },
    });
    return this.format(updated!, company.settings?.currency ?? 'PEN');
  }

  // ───────────────────── helpers ─────────────────────

  private format(
    order: {
      id: string;
      publicCode: string;
      status: string;
      paymentStatus: string;
      deliveryMethod: string;
      customerName: string;
      customerPhone: string;
      address: string | null;
      reference: string | null;
      customerNote: string | null;
      subtotal: unknown;
      deliveryFee: unknown;
      total: unknown;
      reservationExpiresAt: Date | null;
      createdAt: Date;
      items: Array<{
        name: string;
        sku: string | null;
        unitPrice: unknown;
        quantity: number;
        lineTotal: unknown;
      }>;
      payment: {
        status: string;
        expectedAmount: unknown;
        proofUrl?: string | null;
      } | null;
    },
    currency: string,
  ) {
    return {
      id: order.id,
      code: order.publicCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      proofUrl: order.payment?.proofUrl ?? null,
      deliveryMethod: order.deliveryMethod,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.address,
      reference: order.reference,
      customerNote: order.customerNote,
      currency,
      subtotal: String(order.subtotal),
      deliveryFee: String(order.deliveryFee),
      total: String(order.total),
      reservationExpiresAt: order.reservationExpiresAt,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        unitPrice: String(i.unitPrice),
        quantity: i.quantity,
        lineTotal: String(i.lineTotal),
      })),
    };
  }
}
