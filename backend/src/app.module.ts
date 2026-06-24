import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { MediaModule } from './media/media.module';
import { StorefrontModule } from './storefront/storefront.module';
import { OrdersModule } from './orders/orders.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StoreSettingsModule } from './store-settings/store-settings.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { CustomersModule } from './customers/customers.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenancyMiddleware } from './tenancy/tenancy.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate limiting por defecto: 100 peticiones por minuto.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    MediaModule,
    StorefrontModule,
    OrdersModule,
    AppointmentsModule,
    SubscriptionsModule,
    DashboardModule,
    StoreSettingsModule,
    SuperAdminModule,
    CustomersModule,
    InventoryModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    // Orden: rate limit -> autenticación -> roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resuelve el tenant por subdominio en todas las rutas.
    consumer
      .apply(TenancyMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
