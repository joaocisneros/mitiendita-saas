import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { DniLookupService } from './dni-lookup.service';

@Module({
  controllers: [CreditsController],
  providers: [CreditsService, DniLookupService],
})
export class CreditsModule {}
