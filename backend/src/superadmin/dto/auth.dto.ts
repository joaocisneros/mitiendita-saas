import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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
