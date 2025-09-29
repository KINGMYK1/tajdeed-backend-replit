import { IsString, IsNotEmpty, IsOptional, IsEmail, Length, IsNumber, IsIn } from 'class-validator';

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

// === Nouveaux DTOs pour authentification email/password ===

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128, { message: 'Le mot de passe doit contenir entre 8 et 128 caractères' })
  password!: string;

  @IsString()
  @IsOptional()
  username?: string;
}

export class LoginDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ResetPasswordRequestDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128, { message: 'Le mot de passe doit contenir entre 8 et 128 caractères' })
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ResendVerificationDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

// === DTOs pour modération ===

export class ModerationActionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsIn(['WARNING', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'CONTENT_REMOVAL', 'ACCOUNT_RESTRICTION'])
  action!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsNumber()
  duration?: number; // en heures pour les actions temporaires

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserWarningDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity!: string;
}

export class AuthResponseExtendedDto extends AuthResponseDto {
  emailVerified?: boolean;
  status?: string;
}