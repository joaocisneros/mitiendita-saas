import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SaPlansService } from '../services/sa-plans.service';

/**
 * Lista pública (sin login) de los planes activos.
 * La consume la landing para mostrar precios reales configurados por el superadmin.
 */
@Public()
@Controller('public/plans')
export class PublicPlansController {
  constructor(private readonly plans: SaPlansService) {}

  @Get()
  list() {
    return this.plans.listPublic();
  }
}
