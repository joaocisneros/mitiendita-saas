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
import { MarkPaidDto, UpdateSubscriptionDto } from '../dto/subscription.dto';
import { SaSubscriptionsService } from '../services/sa-subscriptions.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaSubscriptionsController {
  constructor(private readonly subscriptions: SaSubscriptionsService) {}

  @Get('subscriptions')
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.subscriptions.list({
      status: status || undefined,
      search: search?.trim() || undefined,
      page: page ? Number(page) : 1,
    });
  }

  @HttpCode(200)
  @Post('companies/:id/subscription/mark-paid')
  markPaid(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.subscriptions.markPaid(user.userId, id, dto.months ?? 1);
  }

  @Patch('companies/:id/subscription')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptions.update(user.userId, id, dto);
  }
}
