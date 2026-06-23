import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';
import { SaPlansService } from '../services/sa-plans.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaPlansController {
  constructor(private readonly plans: SaPlansService) {}

  @Get('plans')
  list() {
    return this.plans.list();
  }

  @Post('plans')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePlanDto) {
    return this.plans.create(user.userId, dto);
  }

  @Patch('plans/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plans.update(user.userId, id, dto);
  }
}
