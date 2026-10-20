import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMonth!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxProducts?: number | null;

  /** Fotos por producto (1 a 12). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12, { message: 'Máximo 12 fotos por producto.' })
  maxImages?: number;

  @IsOptional()
  @IsBoolean()
  featExcel?: boolean;

  @IsOptional()
  @IsBoolean()
  featCredits?: boolean;

  @IsOptional()
  @IsBoolean()
  featSeo?: boolean;

  @IsOptional()
  @IsBoolean()
  featPrioritySupport?: boolean;

  @IsOptional()
  @IsBoolean()
  featSetup?: boolean;

  @IsOptional()
  @IsBoolean()
  featNoBranding?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** false = plan privado (no sale en la página de precios). */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxProducts?: number | null;

  /** Fotos por producto (1 a 12). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12, { message: 'Máximo 12 fotos por producto.' })
  maxImages?: number;

  @IsOptional()
  @IsBoolean()
  featExcel?: boolean;

  @IsOptional()
  @IsBoolean()
  featCredits?: boolean;

  @IsOptional()
  @IsBoolean()
  featSeo?: boolean;

  @IsOptional()
  @IsBoolean()
  featPrioritySupport?: boolean;

  @IsOptional()
  @IsBoolean()
  featSetup?: boolean;

  @IsOptional()
  @IsBoolean()
  featNoBranding?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** false = plan privado (no sale en la página de precios). */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
