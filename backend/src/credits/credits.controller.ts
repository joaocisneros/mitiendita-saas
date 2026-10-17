import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { CreditsService } from './credits.service';
import { DniLookupService } from './dni-lookup.service';
import {
  CreateCreditCustomerDto,
  UpdateCreditCustomerDto,
} from './dto/credit-customer.dto';
import {
  CancelCreditSaleDto,
  CreateCreditSaleDto,
} from './dto/credit-sale.dto';
import {
  CreateCreditPaymentDto,
  UpdateCreditPaymentDto,
} from './dto/credit-payment.dto';

/** Ventas al crédito del panel del dueño. */
@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/credits')
export class CreditsController {
  constructor(
    private readonly credits: CreditsService,
    private readonly dni: DniLookupService,
  ) {}

  /** Autocompleta nombre y apellidos por DNI (consume la cuota de la plataforma). */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('dni/:number')
  lookupDni(
    @CurrentUser('companyId') companyId: string,
    @Param('number') number: string,
  ) {
    return this.dni.lookup(companyId, number);
  }

  @Get('summary')
  summary(@CurrentUser('companyId') companyId: string) {
    return this.credits.summary(companyId);
  }

  @Get('customers')
  listCustomers(
    @CurrentUser('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.credits.listCustomers(companyId, {
      search,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('customers')
  createCustomer(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCreditCustomerDto,
  ) {
    return this.credits.createCustomer(companyId, dto);
  }

  @Get('customers/:id')
  getCustomer(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credits.getCustomer(companyId, id);
  }

  @Patch('customers/:id')
  updateCustomer(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditCustomerDto,
  ) {
    return this.credits.updateCustomer(companyId, id, dto);
  }

  @Delete('customers/:id')
  deleteCustomer(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credits.deleteCustomer(companyId, id);
  }

  @Post('customers/:id/sales')
  createSale(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCreditSaleDto,
  ) {
    return this.credits.createSale(companyId, userId, id, dto);
  }

  @Post('sales/:id/cancel')
  cancelSale(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCreditSaleDto,
  ) {
    return this.credits.cancelSale(companyId, userId, id, dto);
  }

  @Post('customers/:id/payments')
  createPayment(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCreditPaymentDto,
  ) {
    return this.credits.createPayment(companyId, userId, id, dto);
  }

  @Patch('payments/:id')
  updatePayment(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditPaymentDto,
  ) {
    return this.credits.updatePayment(companyId, id, dto);
  }

  @Delete('payments/:id')
  deletePayment(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credits.deletePayment(companyId, id);
  }
}
