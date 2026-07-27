import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { SaAuthController } from './controllers/sa-auth.controller';
import { SaStatsController } from './controllers/sa-stats.controller';
import { SaCompaniesController } from './controllers/sa-companies.controller';
import { SaPlansController } from './controllers/sa-plans.controller';
import { PublicPlansController } from './controllers/public-plans.controller';
import { SaSubscriptionsController } from './controllers/sa-subscriptions.controller';
import { SaUsersController } from './controllers/sa-users.controller';
import { SaAuditsController } from './controllers/sa-audits.controller';
import { SaSettingsController } from './controllers/sa-settings.controller';
import { SaWhatsappController } from './controllers/sa-whatsapp.controller';
import { SaApiTokensController } from './controllers/sa-api-tokens.controller';

import { SaAuthService } from './services/sa-auth.service';
import { SaStatsService } from './services/sa-stats.service';
import { SaCompaniesService } from './services/sa-companies.service';
import { SaPlansService } from './services/sa-plans.service';
import { SaSubscriptionsService } from './services/sa-subscriptions.service';
import { SaUsersService } from './services/sa-users.service';
import { SaAuditService } from './services/sa-audit.service';
import { SaSettingsService } from './services/sa-settings.service';
import { SaWhatsappService } from './services/sa-whatsapp.service';

@Module({
  imports: [JwtModule.register({}), WhatsappModule, ApiTokensModule],
  controllers: [
    SaAuthController,
    SaStatsController,
    SaCompaniesController,
    SaPlansController,
    PublicPlansController,
    SaSubscriptionsController,
    SaUsersController,
    SaAuditsController,
    SaSettingsController,
    SaWhatsappController,
    SaApiTokensController,
  ],
  providers: [
    SaAuthService,
    SaStatsService,
    SaCompaniesService,
    SaPlansService,
    SaSubscriptionsService,
    SaUsersService,
    SaAuditService,
    SaSettingsService,
    SaWhatsappService,
  ],
  exports: [
    SaCompaniesService,
    SaUsersService,
    SaPlansService,
    SaSubscriptionsService,
    SaAuditService,
    SaWhatsappService,
    SaSettingsService,
  ],
})
export class SuperAdminModule {}
