import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
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
  @ValidateIf((o: UpdatePlatformSettingsDto) => o.supportWhatsapp !== '')
  @Matches(/^519\d{8}$/, {
    message: 'El WhatsApp de soporte debe ser un celular peruano de 9 dígitos.',
  })
  supportWhatsapp?: string;

  @IsOptional()
  @ValidateIf((o: UpdatePlatformSettingsDto) => o.supportEmail !== '')
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
  @IsString()
  @MaxLength(191)
  legalName?: string;

  @IsOptional()
  @ValidateIf((o: UpdatePlatformSettingsDto) => o.legalRuc !== '')
  @Matches(/^(10|15|17|20)\d{9}$/, {
    message: 'El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20.',
  })
  legalRuc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalAddress?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;
}
