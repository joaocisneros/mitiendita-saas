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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Public } from '../common/decorators/public.decorator';

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

/** Reserva pública de servicios (sin login). Resuelto por subdominio. */
@Public()
@Controller('public/stores/:subdomain')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('appointments')
  create(
    @Param('subdomain') subdomain: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.create(subdomain, dto);
  }

  /** El cliente sube el comprobante del adelanto Yape de una cita. */
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('appointments/:id/proof')
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
    return this.appointments.submitProof(subdomain, id, file);
  }
}
