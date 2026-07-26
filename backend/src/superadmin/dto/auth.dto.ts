import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

/** Restablecimiento de contraseña (usuarios globales y dueños de empresa). */
export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

/** Edición del propio perfil del superadmin: nombre y/o contraseña (no el correo). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword?: string;
}
