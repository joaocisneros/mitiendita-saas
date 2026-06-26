import {
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Public } from '../common/decorators/public.decorator';

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

/** Suscripción pública a planes digitales (sin login). Resuelto por subdominio. */
@Public()
@Controller('public/stores/:subdomain')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('subscriptions')
  create(
    @Param('subdomain') subdomain: string,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptions.create(subdomain, dto);
  }

  /** El cliente sube el comprobante Yape de una suscripción digital. */
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('subscriptions/:id/proof')
  @UseInterceptors(FileInterceptor('file'))
  submitProof(
    @Param('subdomain') subdomain: string,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PROOF_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpe?g|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.subscriptions.submitProof(subdomain, id, file);
  }
}
