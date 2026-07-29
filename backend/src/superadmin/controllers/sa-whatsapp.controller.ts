import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SendWhatsappTestDto, UpdateWhatsappSettingsDto } from '../dto/whatsapp.dto';
import { SaWhatsappService } from '../services/sa-whatsapp.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin/whatsapp')
export class SaWhatsappController {
  constructor(private readonly whatsapp: SaWhatsappService) {}

  @Get()
  get() {
    return this.whatsapp.get();
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateWhatsappSettingsDto) {
    return this.whatsapp.update(user.userId, dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('test')
  test(@Body() dto: SendWhatsappTestDto) {
    return this.whatsapp.sendTest(dto.to);
  }

  @Get('duenos')
  listOwners() {
    return this.whatsapp.listOwners();
  }

  @Get('clientes')
  listCustomers() {
    return this.whatsapp.listCustomers();
  }

  @Get('directorio')
  listDirectory(
    @Query('search') search?: string,
    @Query('role') role?: 'Dueño' | 'Cliente' | 'all',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.whatsapp.listDirectory({
      search,
      role,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
