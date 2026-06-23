import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  summary(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.summary(companyId, from, to);
  }
}
