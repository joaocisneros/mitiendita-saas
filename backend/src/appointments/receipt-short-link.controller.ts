import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AppointmentsService } from './appointments.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Link corto del comprobante de adelanto de una cita: /r/cita/:code →
 * redirige a la página pública del recibo.
 */
@Public()
@Controller('r/cita')
export class AppointmentReceiptShortLinkController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const found = await this.appointments.resolveByCode(code);
    if (!found) {
      res.status(404).type('html').send('<p style="font-family:sans-serif;text-align:center;padding:3rem">Cita no encontrada.</p>');
      return;
    }
    res.redirect(302, `/tienda/${found.subdomain}/cita/${found.id}/recibo`);
  }
}
