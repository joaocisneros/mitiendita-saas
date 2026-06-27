import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizePhone } from '../common/utils/phone.util';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { MediaService } from '../media/media.service';
import { AppointmentStatus, PaymentStatus } from '../../generated/prisma/enums';

type AppointmentRow = {
  id: string;
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
  createdAt: Date;
};

const STATUS_WEIGHT: Record<AppointmentStatus, number> = {
  pending: 1,
  confirmed: 2,
  in_progress: 3,
  completed: 4,
  cancelled: 5,
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

    const appointment = await this.prisma.appointment.create({
      data: {
        companyId: company.id,
        productId: dto.productId ?? null,
        serviceName: dto.serviceName,
        customerName: dto.customerName,
        customerPhone: normalizePhone(dto.customerPhone),
        preferredAt: new Date(dto.preferredAt),
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
      orderBy: [{ preferredAt: 'asc' }],
      take: 200,
    });

    return items
      .sort(
        (a, b) =>
          (STATUS_WEIGHT[a.status] ?? 99) - (STATUS_WEIGHT[b.status] ?? 99),
      )
      .map((a) => this.format(a));
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

  private format(a: AppointmentRow) {
    return {
      id: a.id,
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
      createdAt: a.createdAt,
    };
  }
}
