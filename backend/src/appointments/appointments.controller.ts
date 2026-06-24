import { Body, Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Public } from '../common/decorators/public.decorator';

/** Reserva pública de servicios (sin login). Resuelto por subdominio. */
@Public()
@Controller('public/stores/:subdomain')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('appointments')
  create(
    @Param('subdomain') subdomain: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.create(subdomain, dto);
  }
}
