import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { OrdersModule } from '../orders/orders.module';
import { SuperAdminModule } from '../superadmin/superadmin.module';

@Module({
  imports: [ApiTokensModule, OrdersModule, SuperAdminModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
