import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReportsModule } from '../reports/reports.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SuperAdminModule } from '../superadmin/superadmin.module';

@Module({
  imports: [
    ApiTokensModule,
    OrdersModule,
    ProductsModule,
    CustomersModule,
    InventoryModule,
    ReportsModule,
    AppointmentsModule,
    SubscriptionsModule,
    SuperAdminModule,
  ],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
