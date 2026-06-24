import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Suscripción pública a un plan digital (sin login). */
export class CreateSubscriptionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  customerName!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  customerPhone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  planName!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
