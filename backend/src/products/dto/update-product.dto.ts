import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Todos los campos opcionales. `categoryId: null` desasigna la categoría. */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio admite máximo 2 decimales.' })
  @Min(0, { message: 'El precio no puede ser negativo.' })
  price?: number;

  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero.' })
  @Min(0, { message: 'El stock no puede ser negativo.' })
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsIn(['none', 'optional', 'required'])
  reservationPaymentMode?: 'none' | 'optional' | 'required';

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  reservationAdvanceType?: 'fixed' | 'percent';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El adelanto admite máximo 2 decimales.' })
  @Min(0, { message: 'El adelanto no puede ser negativo.' })
  reservationAdvanceValue?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
