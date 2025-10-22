import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  line1?: string | null;

  @IsOptional()
  @IsString()
  line2?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country?: string | null;

  @IsOptional()
  @IsString()
  zip?: string | null;

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
