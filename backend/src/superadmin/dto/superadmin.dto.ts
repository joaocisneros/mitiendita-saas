import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class AssignPlanDto {
  @IsInt()
  planId!: number;
}

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
