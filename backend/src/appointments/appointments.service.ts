import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizePhone } from '../common/utils/phone.util';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '../../generated/prisma/enums';

type AppointmentRow = {
  id: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  preferredAt: Date;
  note: string | null;
  status: string;
  createdAt: Date;
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /** Reserva pública de un servicio. No mueve stock ni pagos. */
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

    const appointment = await this.prisma.appointment.create({
      data: {
        companyId: company.id,
        productId: dto.productId ?? null,
        serviceName: dto.serviceName,
        customerName: dto.customerName,
        customerPhone: normalizePhone(dto.customerPhone),
        preferredAt: new Date(dto.preferredAt),
        note: dto.note ?? null,
      },
    });

    // Aviso al WhatsApp del dueño (si Twilio está activo). No bloquea la reserva.
    void this.whatsapp.sendAppointmentNotification({
      recipient: company.settings?.whatsappNumber,
      storeName: company.settings?.storeName || company.name,
      serviceName: appointment.serviceName,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      preferredAt: appointment.preferredAt,
    });

    return {
      id: appointment.id,
      status: appointment.status,
      serviceName: appointment.serviceName,
      preferredAt: appointment.preferredAt,
    };
  }

  /** Lista de citas del negocio (panel del dueño). */
  async listForCompany(companyId: string, status?: string) {
    const items = await this.prisma.appointment.findMany({
      where: {
        companyId,
        ...(status && status !== 'all' ? { status: status as AppointmentStatus } : {}),
      },
      orderBy: [{ status: 'asc' }, { preferredAt: 'asc' }],
      take: 200,
    });
    return items.map((a) => this.format(a));
  }

  /** Cambia el estado de una cita (confirmar / completar / cancelar). */
  async updateStatus(
    companyId: string,
    id: string,
    status: AppointmentStatus,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId },
    });
    if (!appointment) throw new NotFoundException('Cita no encontrada.');
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
      createdAt: a.createdAt,
    };
  }
}
