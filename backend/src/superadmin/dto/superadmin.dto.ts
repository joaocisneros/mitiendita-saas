import { IsEmail, IsInt, IsString, MinLength } from 'class-validator';

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
