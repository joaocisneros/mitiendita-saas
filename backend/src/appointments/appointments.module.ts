import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [WhatsappModule, MediaModule],
  controllers: [AppointmentsController, AdminAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
