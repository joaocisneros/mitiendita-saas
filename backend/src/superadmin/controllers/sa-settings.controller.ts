import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { UpdatePlatformSettingsDto } from '../dto/settings.dto';
import { SaSettingsService } from '../services/sa-settings.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaSettingsController {
  constructor(private readonly settings: SaSettingsService) {}

  @Get('settings')
  get() {
    return this.settings.get();
  }

  @Patch('settings')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.settings.update(user.userId, dto);
  }
}
