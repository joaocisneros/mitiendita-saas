import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateApiTokenScopesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  scopes!: string[];
}
