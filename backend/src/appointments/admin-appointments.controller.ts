import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/** Gestión de citas desde el panel del dueño. */
@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
  ) {
    return this.appointments.listForCompany(companyId, status);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointments.updateStatus(companyId, id, dto.status);
  }

  @Post(':id/payment/approve')
  approvePayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.appointments.approvePayment(companyId, id, userId);
  }

  @Post(':id/payment/reject')
  rejectPayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.appointments.rejectPayment(companyId, id, userId, dto.comment);
  }
}
