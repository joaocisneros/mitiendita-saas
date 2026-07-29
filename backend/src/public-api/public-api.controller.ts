import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { ApiTokenGuard } from '../api-tokens/guards/api-token.guard';
import { ApiScope } from '../api-tokens/decorators/api-scope.decorator';
import { CurrentApiToken } from '../api-tokens/decorators/current-api-token.decorator';
import { AdminOrdersService } from '../orders/admin-orders.service';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { ReportsService } from '../reports/reports.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SaCompaniesService } from '../superadmin/services/sa-companies.service';
import { SaUsersService } from '../superadmin/services/sa-users.service';
import { SaPlansService } from '../superadmin/services/sa-plans.service';
import { SaSubscriptionsService } from '../superadmin/services/sa-subscriptions.service';
import { SaAuditService } from '../superadmin/services/sa-audit.service';
import { SaWhatsappService } from '../superadmin/services/sa-whatsapp.service';
import { SaSettingsService } from '../superadmin/services/sa-settings.service';

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
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
    private readonly reports: ReportsService,
    private readonly appointments: AppointmentsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly companies: SaCompaniesService,
    private readonly users: SaUsersService,
    private readonly plans: SaPlansService,
    private readonly saSubscriptions: SaSubscriptionsService,
    private readonly audit: SaAuditService,
    private readonly whatsapp: SaWhatsappService,
    private readonly settings: SaSettingsService,
  ) {}

  private requireCompany(companyId: string | null): string {
    if (!companyId) {
      throw new BadRequestException('Este token no está asociado a una tienda.');
    }
    return companyId;
  }

  // ── Módulos de tienda (token creado para UNA empresa) ──

  @ApiScope('pedidos')
  @Get('pedidos')
  pedidos(
    @CurrentApiToken('companyId') companyId: string | null,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.list(this.requireCompany(companyId), {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiScope('productos')
  @Get('productos')
  productos(
    @CurrentApiToken('companyId') companyId: string | null,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.products.findAll(this.requireCompany(companyId), {
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @ApiScope('clientes')
  @Get('clientes')
  clientes(
    @CurrentApiToken('companyId') companyId: string | null,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customers.findAll(
      this.requireCompany(companyId),
      search,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @ApiScope('inventario')
  @Get('inventario')
  inventario(@CurrentApiToken('companyId') companyId: string | null) {
    return this.inventory.products(this.requireCompany(companyId));
  }

  @ApiScope('reportes')
  @Get('reportes')
  reportes(
    @CurrentApiToken('companyId') companyId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.summary(this.requireCompany(companyId), from, to);
  }

  @ApiScope('citas')
  @Get('citas')
  citas(@CurrentApiToken('companyId') companyId: string | null, @Query('status') status?: string) {
    return this.appointments.listForCompany(this.requireCompany(companyId), status);
  }

  // ── "suscripciones" existe para tienda (sus solicitudes de plan) Y para
  // plataforma (todas las suscripciones comerciales) — se resuelve según el token. ──

  @ApiScope('suscripciones')
  @Get('suscripciones')
  suscripciones(@CurrentApiToken('companyId') companyId: string | null, @Query('filter') filter?: string) {
    if (companyId) return this.subscriptions.listForCompany(companyId, filter);
    return this.saSubscriptions.list({ status: filter });
  }

  // ── Módulos de plataforma (token de superadmin, sin tienda asociada) ──

  @ApiScope('empresas')
  @Get('empresas')
  empresas(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.companies.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiScope('usuarios')
  @Get('usuarios')
  usuarios(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.users.list({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @ApiScope('planes')
  @Get('planes')
  planesEndpoint() {
    return this.plans.list();
  }

  @ApiScope('actividad')
  @Get('actividad')
  actividad(@Query('action') action?: string, @Query('page') page?: string) {
    return this.audit.list({ action, page: page ? Number(page) : undefined });
  }

  @ApiScope('whatsapp')
  @Get('whatsapp')
  async whatsappEndpoint() {
    const [duenos, clientes] = await Promise.all([this.whatsapp.listOwners(), this.whatsapp.listCustomers()]);
    return { duenos, clientes };
  }

  @ApiScope('configuracion')
  @Get('configuracion')
  async configuracion() {
    // No expongas nada de Twilio por esta vía (ni las credenciales, ni el resto de
    // su config): es una integración que hoy no se usa y no aporta al consumidor externo.
    const {
      twilioAuthToken: _twilioAuthToken,
      twilioAccountSid: _twilioAccountSid,
      twilioWhatsappFrom: _twilioWhatsappFrom,
      whatsappEnabled: _whatsappEnabled,
      ...settings
    } = await this.settings.get();
    return settings;
  }
}
