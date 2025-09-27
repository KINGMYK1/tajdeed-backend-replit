import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  state?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    username: string;
    role: string;
  };
  expiresIn!: number;
}

export class UserProfileDto {
  id!: string;
  username!: string;
  role!: string;
  createdAt!: Date;
  updatedAt!: Date;
}