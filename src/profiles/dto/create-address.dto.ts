import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string | null;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

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
