import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Link corto del comprobante de una suscripción: /r/suscripcion/:code →
 * redirige a la página pública del recibo.
 */
@Public()
@Controller('r/suscripcion')
export class SubscriptionReceiptShortLinkController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const found = await this.subscriptions.resolveByCode(code);
    if (!found) {
      res.status(404).type('html').send('<p style="font-family:sans-serif;text-align:center;padding:3rem">Suscripción no encontrada.</p>');
      return;
    }
    res.redirect(302, `/tienda/${found.subdomain}/suscripcion/${found.id}/recibo`);
  }
}
