import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SaSettingsService } from '../services/sa-settings.service';

/**
 * Textos legales públicos (sin login): términos, privacidad y canales de soporte.
 * Los consume la landing para las páginas /terminos y /privacidad.
 */
@Public()
@Controller('public/legal')
export class PublicLegalController {
  constructor(private readonly settings: SaSettingsService) {}

  @Get()
  get() {
    return this.settings.getPublicLegal();
  }
}
