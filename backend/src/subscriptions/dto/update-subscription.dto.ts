import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Acción del dueño sobre una suscripción. */
export class UpdateSubscriptionDto {
  @IsIn(['activate', 'renew', 'cancel', 'edit'])
  action!: 'activate' | 'renew' | 'cancel' | 'edit';

  /** Meses de calendario al activar/renovar (por defecto 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;

  /** Para "edit": fecha de inicio (ISO). */
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  /** Para "edit": fecha de vencimiento (ISO). */
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  /** Para "activate" sin producto vinculado: monto cobrado, ingresado a mano. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;
}
