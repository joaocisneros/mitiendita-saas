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
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ResetPasswordDto } from '../dto/auth.dto';
import {
  AssignPlanDto,
  CreateCompanyDto,
  UpdateCompanyDto,
} from '../dto/company.dto';
import { SaCompaniesService } from '../services/sa-companies.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaCompaniesController {
  constructor(private readonly companies: SaCompaniesService) {}

  @Get('companies')
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.companies.list({
      search: search?.trim() || undefined,
      status: status || undefined,
      planId: planId ? Number(planId) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('companies/:id')
  get(@Param('id') id: string) {
    return this.companies.get(id);
  }

  @Post('companies')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user.userId, dto);
  }

  @Patch('companies/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(user.userId, id, dto);
  }

  @HttpCode(200)
  @Post('companies/:id/suspend')
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companies.setStatus(user.userId, id, 'suspended');
  }

  @HttpCode(200)
  @Post('companies/:id/activate')
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companies.setStatus(user.userId, id, 'active');
  }

  @Patch('companies/:id/plan')
  assignPlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignPlanDto,
  ) {
    return this.companies.assignPlan(user.userId, id, dto.planId);
  }

  @HttpCode(200)
  @Post('companies/:id/delete')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companies.remove(user.userId, id);
  }

  @HttpCode(200)
  @Post('companies/:id/reset-owner-password')
  resetOwnerPassword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.companies.resetOwnerPassword(user.userId, id, dto.newPassword);
  }

  @HttpCode(200)
  @Post('companies/:id/impersonate')
  impersonate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companies.impersonate(user.userId, id);
  }
}
