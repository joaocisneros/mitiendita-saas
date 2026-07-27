import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ApiTokensService } from '../../api-tokens/api-tokens.service';
import { CreateApiTokenDto } from '../../api-tokens/dto/create-api-token.dto';
import { CreateCompanyApiTokenDto } from '../../api-tokens/dto/create-company-api-token.dto';
import { COMPANY_SCOPES, PLATFORM_SCOPES } from '../../api-tokens/api-token.util';
import { SaCompaniesService } from '../services/sa-companies.service';

/**
 * Tokens de API: los crea siempre el superadmin.
 * - /empresas: token para una tienda puntual (se le avisa por su WhatsApp).
 * - resto: tokens de plataforma, para los propios módulos del superadmin.
 */
@UseGuards(SuperAdminGuard)
@Controller('superadmin/api-tokens')
export class SaApiTokensController {
  constructor(
    private readonly tokens: ApiTokensService,
    private readonly companies: SaCompaniesService,
  ) {}

  @Get('platform-scopes')
  platformScopes() {
    return PLATFORM_SCOPES;
  }

  @Get('company-scopes')
  companyScopes() {
    return COMPANY_SCOPES;
  }

  @Get('companies')
  async listCompanies() {
    const { items } = await this.companies.list({ limit: 200 });
    return items.map((c) => ({ id: c.id, name: c.name, subdomain: c.subdomain }));
  }

  @Get()
  listPlatformTokens() {
    return this.tokens.list(null);
  }

  @Post()
  createPlatformToken(@Body() dto: CreateApiTokenDto) {
    return this.tokens.create(null, dto, PLATFORM_SCOPES);
  }

  @Get('empresas')
  listCompanyTokens() {
    return this.tokens.listAllCompanyTokens();
  }

  @Post('empresas')
  createCompanyToken(@Body() dto: CreateCompanyApiTokenDto) {
    return this.tokens.createForCompany(dto.companyId, dto);
  }

  // Expone el secreto en texto plano: límite aparte, más estricto que el resto de la API.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/reveal')
  reveal(@Param('id') id: string) {
    return this.tokens.reveal(id);
  }

  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.tokens.revoke(id);
  }
}
