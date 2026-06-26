import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { SubscriptionShortLinkController } from './subscription-short-link.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [WhatsappModule, MediaModule],
  controllers: [
    SubscriptionsController,
    AdminSubscriptionsController,
    SubscriptionShortLinkController,
  ],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
