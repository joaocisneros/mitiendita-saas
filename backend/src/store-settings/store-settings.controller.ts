import { Body, Controller, Get, Patch } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/settings')
export class StoreSettingsController {
  constructor(private readonly settings: StoreSettingsService) {}

  @Get()
  get(@CurrentUser('companyId') companyId: string) {
    return this.settings.get(companyId);
  }

  @Patch()
  update(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settings.update(companyId, dto);
  }
}
