import {
  IsBoolean,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Configuración de la tienda. Todos los campos son opcionales. */
export class UpdateSettingsDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  storeName?: string;

  @IsOptional() @IsString() @MaxLength(60)
  businessType?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsString() @MaxLength(500)
  logoUrl?: string;

  @IsOptional() @IsHexColor()
  primaryColor?: string;

  @IsOptional() @IsHexColor()
  secondaryColor?: string;

  @IsOptional() @IsString() @MaxLength(20)
  whatsappNumber?: string;

  @IsOptional() @IsString() @MaxLength(500)
  yapeQrUrl?: string;

  @IsOptional() @IsString() @MaxLength(120)
  yapeHolderName?: string;

  @IsOptional() @IsString() @MaxLength(20)
  yapeNumber?: string;

  @IsOptional() @IsString() @MaxLength(500)
  whatsappMessage?: string;

  @IsOptional() @IsBoolean()
  allowsPickup?: boolean;

  @IsOptional() @IsBoolean()
  allowsDelivery?: boolean;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  deliveryFee?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  minOrder?: number;

  @IsOptional() @IsString() @MaxLength(300)
  storeAddress?: string;

  @IsOptional() @IsString() @MaxLength(500)
  deliveryNotes?: string;
}
