import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExcelReportService } from './excel-report.service';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExcelReportService],
  exports: [ReportsService],
})
export class ReportsModule {}
