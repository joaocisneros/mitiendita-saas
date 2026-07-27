import { ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  scopes!: string[];
}
