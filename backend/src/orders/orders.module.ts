import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ShortLinkController } from './short-link.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderExpirationService } from './order-expiration.service';
import { MediaModule } from '../media/media.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [MediaModule, WhatsappModule],
  controllers: [OrdersController, ShortLinkController, AdminOrdersController],
  providers: [OrdersService, AdminOrdersService, OrderExpirationService],
  exports: [OrdersService],
})
export class OrdersModule {}
