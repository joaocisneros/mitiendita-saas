import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
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
}
