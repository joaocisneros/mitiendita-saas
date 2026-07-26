import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Edición del propio perfil (dueño o superadmin).
 * Permite cambiar nombre y/o contraseña. El correo NO se puede cambiar aquí.
 * Para cambiar la contraseña se exige la contraseña actual.
 */
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
