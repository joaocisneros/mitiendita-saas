import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SaAuditService } from '../services/sa-audit.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaAuditsController {
  constructor(private readonly audit: SaAuditService) {}

  @Get('audits')
  list(
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list({
      action: action || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Get('audit-actions')
  actions() {
    return this.audit.actions();
  }
}
