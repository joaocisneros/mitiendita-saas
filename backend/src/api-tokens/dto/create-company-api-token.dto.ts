import { IsString, MaxLength } from 'class-validator';
import { CreateApiTokenDto } from './create-api-token.dto';

export class CreateCompanyApiTokenDto extends CreateApiTokenDto {
  @IsString()
  @MaxLength(60)
  companyId!: string;
}
