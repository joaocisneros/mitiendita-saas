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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { MediaService } from '../media/media.service';
import { AppointmentStatus, PaymentStatus } from '../../generated/prisma/enums';
import { generateAppointmentCode } from '../common/utils/order-code.util';
import { analyzePaymentProof } from '../common/utils/yape-ocr.util';
import { findDuplicateOperation } from '../common/utils/duplicate-proof.util';

type AppointmentRow = {
  id: string;
  publicCode: string | null;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  preferredAt: Date;
  note: string | null;
  status: AppointmentStatus;
  paymentMode: string | null;
  advanceAmount: { toString(): string } | null;
  paymentStatus: PaymentStatus;
  proofUrl: string | null;
  proofSubmittedAt: Date | null;
  rejectionComment: string | null;
  operationNumber: string | null;
  detectedMethod: string | null;
  createdAt: Date;
};

const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  pending: [AppointmentStatus.confirmed, AppointmentStatus.cancelled],
  confirmed: [
    AppointmentStatus.in_progress,
    AppointmentStatus.completed,
    AppointmentStatus.cancelled,
  ],
  in_progress: [AppointmentStatus.completed, AppointmentStatus.cancelled],
  completed: [],
  cancelled: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly media: MediaService,
  ) {}

  /** Reserva pública de un servicio. Puede ir sin pago o con adelanto por Yape. */
  async create(subdomain: string, dto: CreateAppointmentDto) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      include: { settings: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (company.status !== 'active') {
      throw new ForbiddenException('Esta tienda no está disponible.');
    }

    // Si referencian un servicio, validamos que sea de esta empresa.
    if (dto.productId) {
      const owned = await this.prisma.product.findFirst({
        where: { id: dto.productId, companyId: company.id, deletedAt: null },
        select: { id: true },
      });
      if (!owned) dto.productId = undefined;
    }

    const paymentMode = dto.paymentMode === 'advance' ? 'advance' : 'none';
    const advanceAmount =
      paymentMode === 'advance' ? Number(dto.advanceAmount ?? 0) : null;
    if (paymentMode === 'advance' && (!advanceAmount || advanceAmount <= 0)) {
      throw new BadRequestException('El adelanto debe ser mayor a cero.');
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

    const preferredAt = new Date(dto.preferredAt);
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        companyId: company.id,
        preferredAt,
        status: { not: AppointmentStatus.cancelled },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new BadRequestException(
        'Ese horario ya fue reservado. Elige otro horario disponible.',
      );
    }

    let publicCode = generateAppointmentCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.appointment.findUnique({
        where: { publicCode },
        select: { id: true },
      });
      if (!exists) break;
      publicCode = generateAppointmentCode();
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        companyId: company.id,
        productId: dto.productId ?? null,
        publicCode,
        serviceName: dto.serviceName,
        customerName,
        customerPhone,
        preferredAt,
        note: dto.note ?? null,
        paymentMode,
        advanceAmount,
      },
    });

    // Aviso al WhatsApp del dueño (si WhatsApp Cloud API está activo). No bloquea la reserva.
    void this.whatsapp.sendAppointmentNotification({
      recipient: company.settings?.whatsappNumber,
      storeName: company.settings?.storeName || company.name,
      serviceName: appointment.serviceName,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      preferredAt: appointment.preferredAt,
    });

    return this.format(appointment);
  }

  /** El cliente sube su comprobante Yape cuando eligió adelanto. */
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

    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId: company.id },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');
    if (appointment.status === AppointmentStatus.cancelled) {
      throw new BadRequestException('Esta cita ya no admite comprobantes.');
    }
    if (appointment.paymentMode !== 'advance' || !appointment.advanceAmount) {
      throw new BadRequestException('Esta cita no requiere adelanto.');
    }

    const proofCheck = await analyzePaymentProof(file.buffer);
    if (!proofCheck.looksLikePaymentProof) {
      throw new BadRequestException(
        'La imagen no parece ser un comprobante de Yape o Plin. Sube la captura de pantalla del pago.',
      );
    }
    if (proofCheck.operationNumber && process.env.NODE_ENV === 'production') {
      const isDuplicate = await findDuplicateOperation(this.prisma, company.id, proofCheck.operationNumber, {
        appointmentId: appointment.id,
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
      'appointment-proofs',
    );

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        proofUrl: uploaded.url,
        proofSubmittedAt: new Date(),
        operationNumber: proofCheck.operationNumber,
        detectedMethod: proofCheck.detectedMethod,
        paymentStatus: PaymentStatus.proof_submitted,
      },
    });

    if (appointment.proofUrl && appointment.proofUrl !== uploaded.url) {
      void this.media.deleteByUrl(appointment.proofUrl);
    }

    return this.format(updated);
  }

  /** Lista de citas del negocio (panel del dueño). */
  async listForCompany(companyId: string, status?: string) {
    const items = await this.prisma.appointment.findMany({
      where: {
        companyId,
        ...(status && status !== 'all'
          ? { status: status as AppointmentStatus }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    // Orden fijo por cuándo se envió la solicitud (más nuevo primero): cambiar de estado no corre la fila de lugar.
    return items.map((a) => this.format(a));
  }

  /** Cambia el estado de una cita respetando el flujo de atención. */
  async updateStatus(
    companyId: string,
    id: string,
    status: AppointmentStatus,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');

    const allowed = APPOINTMENT_TRANSITIONS[appointment.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        'Este cambio de estado no está permitido para la cita.',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status },
    });
    return this.format(updated);
  }

  /** Aprueba el adelanto de una cita (panel del dueño). */
  async approvePayment(companyId: string, id: string, userId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');
    if (appointment.paymentMode !== 'advance') {
      throw new BadRequestException('Esta cita no tiene adelanto para aprobar.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.approved,
        validatedAt: new Date(),
        validatedByUserId: userId,
        rejectionComment: null,
        // Aprobar el adelanto ya implica aceptar la reserva: no hace falta un segundo clic en "Confirmar".
        status: appointment.status === AppointmentStatus.pending ? AppointmentStatus.confirmed : appointment.status,
      },
    });
    return this.format(updated);
  }

  /** Rechaza el adelanto de una cita. El cliente puede resubir el comprobante. */
  async rejectPayment(
    companyId: string,
    id: string,
    userId: string,
    comment?: string,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');
    if (appointment.paymentMode !== 'advance') {
      throw new BadRequestException('Esta cita no tiene adelanto para rechazar.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.rejected,
        rejectionComment: comment ?? null,
        validatedAt: new Date(),
        validatedByUserId: userId,
      },
    });
    return this.format(updated);
  }

  /** Horarios ya reservados (no cancelados) de una fecha, para no ofrecerlos de nuevo. */
  async getAvailability(subdomain: string, date: string) {
    const company = await this.prisma.company.findFirst({
      where: { subdomain, deletedAt: null },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Tienda no encontrada.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Fecha inválida.');
    }

    const items = await this.prisma.appointment.findMany({
      where: {
        companyId: company.id,
        preferredAt: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59.999`),
        },
        status: { not: AppointmentStatus.cancelled },
      },
      select: { preferredAt: true },
    });
    return { bookedTimes: items.map((a) => a.preferredAt.toISOString()) };
  }

  /** Detalle público de una cita, para la página de recibo (sin login). */
  async getPublic(subdomain: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, company: { subdomain, deletedAt: null } },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');
    return this.format(appointment);
  }

  /** Resuelve id + subdominio a partir del código corto (para el link corto del recibo). */
  async resolveByCode(code: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { publicCode: code },
      select: { id: true, company: { select: { subdomain: true } } },
    });
    if (!appointment) return null;
    return { id: appointment.id, subdomain: appointment.company.subdomain };
  }

  /** Devuelve la URL de la foto del adelanto por su código (para el link corto). */
  async getProofUrlByCode(code: string): Promise<string | null> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { OR: [{ publicCode: code }, { id: code }] },
      select: { proofUrl: true },
    });
    return appointment?.proofUrl ?? null;
  }

  private format(a: AppointmentRow) {
    return {
      id: a.id,
      publicCode: a.publicCode,
      serviceName: a.serviceName,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      preferredAt: a.preferredAt,
      note: a.note,
      status: a.status,
      paymentMode: a.paymentMode ?? 'none',
      advanceAmount: a.advanceAmount?.toString() ?? null,
      paymentStatus: a.paymentStatus,
      proofUrl: a.proofUrl,
      proofSubmittedAt: a.proofSubmittedAt,
      rejectionComment: a.rejectionComment,
      operationNumber: a.operationNumber,
      detectedMethod: a.detectedMethod,
      createdAt: a.createdAt,
    };
  }
}
