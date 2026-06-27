import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Reserva pública de un servicio (sin login). */
export class CreateAppointmentDto {
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
  serviceName!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  /** Día y hora deseados (ISO 8601, p. ej. del input datetime-local). */
  @IsDateString()
  preferredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsIn(['none', 'advance'])
  paymentMode?: 'none' | 'advance';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceAmount?: number;
}
