import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ApiTokenGuard } from '../api-tokens/guards/api-token.guard';
import { ApiScope } from '../api-tokens/decorators/api-scope.decorator';
import { CurrentApiToken } from '../api-tokens/decorators/current-api-token.decorator';
import { AdminOrdersService } from '../orders/admin-orders.service';
import { SaCompaniesService } from '../superadmin/services/sa-companies.service';

/**
 * API pública para integraciones externas, autenticada con un ApiToken (mt_live_...)
 * en vez de sesión de usuario. Cada endpoint exige el módulo (@ApiScope) correspondiente.
 * Límite propio (independiente del resto de la app) para acotar el abuso de un token filtrado.
 */
@Public()
@UseGuards(ApiTokenGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('v1')
export class PublicApiController {
  constructor(
    private readonly orders: AdminOrdersService,
    private readonly companies: SaCompaniesService,
  ) {}

  @ApiScope('pedidos')
  @Get('pedidos')
  pedidos(
    @CurrentApiToken('companyId') companyId: string | null,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('Este token no está asociado a una tienda.');
    }
    return this.orders.list(companyId, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiScope('empresas')
  @Get('empresas')
  empresas(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.companies.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
