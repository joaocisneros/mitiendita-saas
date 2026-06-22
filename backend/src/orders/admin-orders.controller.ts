import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  list(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.list(companyId, {
      status,
      paymentStatus,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  get(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.orders.get(companyId, id);
  }

  @Post(':id/payment/approve')
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.orders.approvePayment(companyId, id, userId);
  }

  @Post(':id/payment/reject')
  reject(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.orders.rejectPayment(companyId, id, userId, dto.comment);
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.orders.changeStatus(companyId, id, dto.status, userId, dto.comment);
  }
}
