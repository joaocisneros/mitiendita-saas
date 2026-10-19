import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExcelReportService } from './excel-report.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly excel: ExcelReportService,
  ) {}

  @Get()
  summary(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.summary(companyId, from, to);
  }

  /** Excel del mes (tienda virtual o ventas al crédito). Trae costos y ganancia: solo la dueña. */
  @Roles('OWNER')
  @Get('excel')
  async downloadExcel(
    @CurrentUser('companyId') companyId: string,
    @Query('section') section = '',
    @Query('month') month = '',
  ) {
    const { buffer, fileName } = await this.excel.build(
      companyId,
      section,
      month,
    );
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}
