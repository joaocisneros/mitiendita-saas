import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import {
  AssignPlanDto,
  CreatePlanDto,
  SuperAdminLoginDto,
  UpdatePlanDto,
} from './dto/superadmin.dto';
import { SuperAdminService } from './superadmin.service';

@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly superadmin: SuperAdminService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superadmin.login(dto.email, dto.password);
  }

  @UseGuards(SuperAdminGuard)
  @Get('stats')
  stats() {
    return this.superadmin.stats();
  }

  @UseGuards(SuperAdminGuard)
  @Get('companies')
  companies(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superadmin.listCompanies({
      search: search?.trim() || undefined,
      status: status || undefined,
      planId: planId ? Number(planId) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @UseGuards(SuperAdminGuard)
  @Get('companies/:id')
  company(@Param('id') id: string) {
    return this.superadmin.getCompany(id);
  }

  @UseGuards(SuperAdminGuard)
  @Get('plans')
  plans() {
    return this.superadmin.listPlans();
  }

  @UseGuards(SuperAdminGuard)
  @Post('plans')
  createPlan(@CurrentUser() user: AuthUser, @Body() dto: CreatePlanDto) {
    return this.superadmin.createPlan(user.userId, dto);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('plans/:id')
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.superadmin.updatePlan(user.userId, id, dto);
  }

  @UseGuards(SuperAdminGuard)
  @HttpCode(200)
  @Post('companies/:id/suspend')
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.superadmin.setStatus(user.userId, id, 'suspended');
  }

  @UseGuards(SuperAdminGuard)
  @HttpCode(200)
  @Post('companies/:id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.superadmin.setStatus(user.userId, id, 'active');
  }

  @UseGuards(SuperAdminGuard)
  @Patch('companies/:id/plan')
  assignPlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignPlanDto,
  ) {
    return this.superadmin.assignPlan(user.userId, id, dto.planId);
  }

  @UseGuards(SuperAdminGuard)
  @Get('audits')
  audits(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.superadmin.listAudits(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
    );
  }
}
