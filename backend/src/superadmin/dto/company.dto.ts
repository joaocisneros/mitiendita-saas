import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AssignPlanDto {
  @IsInt()
  planId!: number;
}

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  responsibleName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  commercialName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(63)
  subdomain!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  whatsappNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessType?: string;

  @IsOptional()
  @IsInt()
  planId?: number;
}

/** Edición de los datos comerciales de una empresa (no toca al propietario). */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  subdomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  storeAddress?: string;

  @IsOptional()
  @IsBoolean()
  allowsPickup?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsDelivery?: boolean;
}
