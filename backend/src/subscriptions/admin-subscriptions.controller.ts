import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/** Gestión de suscripciones desde el panel del dueño. */
@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  list(
    @CurrentUser('companyId') companyId: string,
    @Query('filter') filter?: string,
  ) {
    return this.subscriptions.listForCompany(companyId, filter);
  }

  @Get('summary')
  summary(@CurrentUser('companyId') companyId: string) {
    return this.subscriptions.summary(companyId);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptions.updateAction(companyId, id, dto.action, {
      months: dto.months,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      price: dto.price,
    });
  }

  /** Aprueba la renovación que el cliente pidió desde su link público. */
  @Post(':id/renewal/approve')
  approveRenewal(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptions.approveRenewal(companyId, id);
  }

  /** Rechaza el comprobante de renovación. */
  @Post(':id/renewal/reject')
  rejectRenewal(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.subscriptions.rejectRenewal(companyId, id);
  }
}
