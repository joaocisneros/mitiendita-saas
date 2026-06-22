import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  Headers,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Public } from '../common/decorators/public.decorator';

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Checkout y seguimiento públicos (sin login). Resuelto por subdominio.
 */
@Public()
@Controller('public/stores/:subdomain')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('checkout')
  checkout(
    @Param('subdomain') subdomain: string,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orders.checkout(subdomain, dto, idempotencyKey);
  }

  @Get('orders/:code')
  getOrder(
    @Param('subdomain') subdomain: string,
    @Param('code') code: string,
  ) {
    return this.orders.getByCode(subdomain, code);
  }

  /** El cliente sube su comprobante de pago Yape (imagen). */
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('orders/:code/proof')
  @UseInterceptors(FileInterceptor('file'))
  submitProof(
    @Param('subdomain') subdomain: string,
    @Param('code') code: string,
    @Body('reportedAmount') reportedAmount: string | undefined,
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
    return this.orders.submitProof(
      subdomain,
      code,
      file,
      reportedAmount ? Number(reportedAmount) : undefined,
    );
  }
}
