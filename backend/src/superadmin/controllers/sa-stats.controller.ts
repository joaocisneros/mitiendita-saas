import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SaStatsService } from '../services/sa-stats.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaStatsController {
  constructor(private readonly stats: SaStatsService) {}

  @Get('stats')
  dashboard(@Query('days') days?: string) {
    return this.stats.dashboard(days ? Number(days) : 30);
  }
}
