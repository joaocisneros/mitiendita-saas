import {
  ArrayMaxSize,
  IsArray,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PRODUCT_TYPES } from '../product-types';

export class ProductVariantStockDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsInt()
  @Min(0)
  stock!: number;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio admite máximo 2 decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser negativo.' })
  price!: number;

  /** Lo que le costó a la dueña (privado, para calcular la ganancia). null = sin costo. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El costo admite máximo 2 decimales.' },
  )
  @Min(0, { message: 'El costo no puede ser negativo.' })
  cost?: number | null;

  @IsInt({ message: 'El stock debe ser un número entero.' })
  @Min(0, { message: 'El stock no puede ser negativo.' })
  stock!: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'Máximo 6 fotos por producto.' })
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  material?: string;

  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sizeGuide?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  sizes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  colors?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantStockDto)
  variantStocks?: ProductVariantStockDto[];

  @IsOptional()
  @IsIn(['none', 'optional', 'required'])
  reservationPaymentMode?: 'none' | 'optional' | 'required';

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  reservationAdvanceType?: 'fixed' | 'percent';

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El adelanto admite máximo 2 decimales.' },
  )
  @Min(0, { message: 'El adelanto no puede ser negativo.' })
  reservationAdvanceValue?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
