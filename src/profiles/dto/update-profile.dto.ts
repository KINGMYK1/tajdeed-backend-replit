import { IsOptional, IsString, ValidateIf, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  preferences?: Record<string, any> | null;
}
