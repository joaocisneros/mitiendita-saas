import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminLoginDto, AssignPlanDto } from './dto/superadmin.dto';
import { Public } from '../common/decorators/public.decorator';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly superadmin: SuperAdminService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superadmin.login(dto.email, dto.password);
  }

  // ── Rutas protegidas (solo superadmin) ──
  @UseGuards(SuperAdminGuard)
  @Get('stats')
  stats() {
    return this.superadmin.stats();
  }

  @UseGuards(SuperAdminGuard)
  @Get('companies')
  companies(@Query('search') search?: string) {
    return this.superadmin.listCompanies(search);
  }

  @UseGuards(SuperAdminGuard)
  @Get('plans')
  plans() {
    return this.superadmin.listPlans();
  }

  @UseGuards(SuperAdminGuard)
  @HttpCode(200)
  @Post('companies/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.superadmin.setStatus(id, 'suspended');
  }

  @UseGuards(SuperAdminGuard)
  @HttpCode(200)
  @Post('companies/:id/activate')
  activate(@Param('id') id: string) {
    return this.superadmin.setStatus(id, 'active');
  }

  @UseGuards(SuperAdminGuard)
  @Patch('companies/:id/plan')
  assignPlan(@Param('id') id: string, @Body() dto: AssignPlanDto) {
    return this.superadmin.assignPlan(id, dto.planId);
  }
}
