import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SaAuthController } from './controllers/sa-auth.controller';
import { SaStatsController } from './controllers/sa-stats.controller';
import { SaCompaniesController } from './controllers/sa-companies.controller';
import { SaPlansController } from './controllers/sa-plans.controller';
import { SaSubscriptionsController } from './controllers/sa-subscriptions.controller';
import { SaUsersController } from './controllers/sa-users.controller';
import { SaAuditsController } from './controllers/sa-audits.controller';
import { SaSettingsController } from './controllers/sa-settings.controller';

import { SaAuthService } from './services/sa-auth.service';
import { SaStatsService } from './services/sa-stats.service';
import { SaCompaniesService } from './services/sa-companies.service';
import { SaPlansService } from './services/sa-plans.service';
import { SaSubscriptionsService } from './services/sa-subscriptions.service';
import { SaUsersService } from './services/sa-users.service';
import { SaAuditService } from './services/sa-audit.service';
import { SaSettingsService } from './services/sa-settings.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    SaAuthController,
    SaStatsController,
    SaCompaniesController,
    SaPlansController,
    SaSubscriptionsController,
    SaUsersController,
    SaAuditsController,
    SaSettingsController,
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
  ],
})
export class SuperAdminModule {}
