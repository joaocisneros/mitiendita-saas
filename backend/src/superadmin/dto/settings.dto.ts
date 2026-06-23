import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Configuración global de la plataforma. Todos los campos son opcionales (patch parcial). */
export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  platformName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mainDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supportWhatsapp?: string;

  @IsOptional()
  @ValidateIf((o) => o.supportEmail !== '')
  @IsEmail()
  @MaxLength(160)
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  terms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  privacy?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;
}
