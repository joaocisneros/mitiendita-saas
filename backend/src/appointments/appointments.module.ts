import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AppointmentReceiptShortLinkController } from './receipt-short-link.controller';
import { AppointmentProofShortLinkController } from './proof-short-link.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [WhatsappModule, MediaModule],
  controllers: [
    AppointmentsController,
    AdminAppointmentsController,
    AppointmentReceiptShortLinkController,
    AppointmentProofShortLinkController,
  ],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
