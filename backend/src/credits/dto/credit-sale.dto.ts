import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreditSaleItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  /** Precio pactado para el crédito. Si no se envía, se usa el precio del producto. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

export class CreateCreditSaleDto {
  @ValidateNested({ each: true })
  @Type(() => CreditSaleItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  items!: CreditSaleItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Fecha de entrega (por defecto, ahora). */
  @IsOptional()
  @IsDateString()
  soldAt?: string;
}

export class CancelCreditSaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
