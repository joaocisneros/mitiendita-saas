import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Datos para registrar una nueva empresa + su usuario propietario.
 */
export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  responsibleName!: string; // nombre del responsable

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  commercialName!: string; // nombre comercial / de la tienda

  @IsString()
  @MinLength(3)
  @MaxLength(63)
  subdomain!: string; // subdominio deseado (se normaliza en el servidor)

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  whatsappNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessType?: string; // opcional e informativo
}
