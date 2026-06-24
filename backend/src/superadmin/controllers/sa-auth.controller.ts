import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SuperAdminLoginDto } from '../dto/auth.dto';
import { SaAuthService } from '../services/sa-auth.service';

@Controller('superadmin')
export class SaAuthController {
  constructor(private readonly auth: SaAuthService) {}

  // Límite estricto anti-fuerza-bruta: 5 intentos por minuto.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: SuperAdminLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
