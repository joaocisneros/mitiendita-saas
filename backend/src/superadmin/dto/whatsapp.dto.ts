import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Configuración de la integración de WhatsApp (Twilio). Patch parcial. */
export class UpdateWhatsappSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountSid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsappFrom?: string;
}

export class SendWhatsappTestDto {
  @IsString()
  @MaxLength(20)
  to!: string;
}
