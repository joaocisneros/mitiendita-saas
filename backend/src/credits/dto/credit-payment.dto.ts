import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CreditPaymentMethod } from '../../../generated/prisma/enums';

/** Corrección del último abono: mismos datos, sin cambiar de venta. */
export class UpdateCreditPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsEnum(CreditPaymentMethod)
  method?: CreditPaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  note?: string;
}

export class CreateCreditPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  /** Venta a la que se abona. Sin ella, el abono se reparte desde la más antigua. */
  @IsOptional()
  @IsUUID()
  creditSaleId?: string;

  @IsOptional()
  @IsEnum(CreditPaymentMethod)
  method?: CreditPaymentMethod;

  /** Fecha del abono (por defecto, ahora). */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  note?: string;
}
