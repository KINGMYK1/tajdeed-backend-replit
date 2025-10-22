import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';

export class CreateItemDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsUUID()
  categoryId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];
}