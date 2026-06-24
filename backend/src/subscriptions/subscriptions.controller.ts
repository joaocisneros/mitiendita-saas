import { Body, Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Public } from '../common/decorators/public.decorator';

/** Suscripción pública a planes digitales (sin login). Resuelto por subdominio. */
@Public()
@Controller('public/stores/:subdomain')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('subscriptions')
  create(
    @Param('subdomain') subdomain: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptions.create(subdomain, dto);
  }
}
