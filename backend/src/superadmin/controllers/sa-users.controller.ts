import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ResetPasswordDto } from '../dto/auth.dto';
import { SaUsersService } from '../services/sa-users.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin')
export class SaUsersController {
  constructor(private readonly users: SaUsersService) {}

  @Get('users')
  list(@Query('search') search?: string, @Query('page') page?: string) {
    return this.users.list({
      search: search?.trim() || undefined,
      page: page ? Number(page) : 1,
    });
  }

  @HttpCode(200)
  @Post('users/:id/reset-password')
  resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.users.resetPassword(user.userId, id, dto.newPassword);
  }

  @HttpCode(200)
  @Post('users/:id/toggle')
  toggle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.toggle(user.userId, id);
  }
}
