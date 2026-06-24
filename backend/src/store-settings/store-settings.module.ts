import { Module } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { StoreSettingsController } from './store-settings.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [StoreSettingsController],
  providers: [StoreSettingsService],
})
export class StoreSettingsModule {}
