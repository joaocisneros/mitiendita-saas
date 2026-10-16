import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import {
  TestDocumentApiConfigDto,
  UpdateDocumentApiConfigDto,
} from '../dto/document-api.dto';
import { SaDocumentApiService } from '../services/sa-document-api.service';

@UseGuards(SuperAdminGuard)
@Controller('superadmin/ruc-dni')
export class SaDocumentApiController {
  constructor(private readonly documents: SaDocumentApiService) {}

  @Get('config')
  config() {
    return this.documents.config();
  }

  @Patch('config')
  updateConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDocumentApiConfigDto,
  ) {
    return this.documents.updateConfig(user.userId, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('test')
  test(@CurrentUser() user: AuthUser, @Body() dto: TestDocumentApiConfigDto) {
    return this.documents.test(user.userId, dto);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('quota')
  quota() {
    return this.documents.quota();
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('ruc/:number')
  ruc(@CurrentUser() user: AuthUser, @Param('number') number: string) {
    return this.documents.consult(user.userId, 'ruc', number);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('dni/:number')
  dni(@CurrentUser() user: AuthUser, @Param('number') number: string) {
    return this.documents.consult(user.userId, 'dni', number);
  }
}
