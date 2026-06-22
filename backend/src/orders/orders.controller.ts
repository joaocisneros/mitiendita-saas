import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Public } from '../common/decorators/public.decorator';

/**
 * Checkout y seguimiento públicos (sin login). Resuelto por subdominio.
 */
@Public()
@Controller('public/stores/:subdomain')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('checkout')
  checkout(
    @Param('subdomain') subdomain: string,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orders.checkout(subdomain, dto, idempotencyKey);
  }

  @Get('orders/:code')
  getOrder(
    @Param('subdomain') subdomain: string,
    @Param('code') code: string,
  ) {
    return this.orders.getByCode(subdomain, code);
  }
}
