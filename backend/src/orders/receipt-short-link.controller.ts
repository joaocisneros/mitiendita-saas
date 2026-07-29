import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Link corto del recibo de un pedido: /r/pedido/:code → redirige a la página
 * pública del recibo. Así el mensaje de WhatsApp lleva una URL corta.
 */
@Public()
@Controller('r/pedido')
export class OrderReceiptShortLinkController {
  constructor(private readonly orders: OrdersService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const found = await this.orders.resolveByCode(code);
    if (!found) {
      res.status(404).type('html').send('<p style="font-family:sans-serif;text-align:center;padding:3rem">Pedido no encontrado.</p>');
      return;
    }
    res.redirect(302, `/tienda/${found.subdomain}/pedido/${code}/recibo`);
  }
}
