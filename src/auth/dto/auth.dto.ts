import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsEmail,
  Length,
  IsNumber,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

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

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code de vérification doit contenir exactement 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code de vérification doit être composé uniquement de chiffres' })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128, { message: 'Le mot de passe doit contenir entre 8 et 128 caractères' })
  newPassword!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code de vérification doit contenir exactement 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code de vérification doit être composé uniquement de chiffres' })
  code!: string;
}

export class ResendVerificationDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
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

// === DTOs pour gestion des admins ===

export class CreateAdminDto {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @Length(8, 128, { message: 'Le mot de passe doit contenir entre 8 et 128 caractères' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name!: string;

  @IsString()
  @IsIn(['MODERATOR', 'ADMIN', 'SUPER_ADMIN'], { message: 'Le rôle doit être MODERATOR, ADMIN ou SUPER_ADMIN' })
  role!: string;
}

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'], { message: 'Le rôle doit être USER, MODERATOR, ADMIN ou SUPER_ADMIN' })
  role!: string;
}

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty({ message: 'La raison de la suspension est requise' })
  reason!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La durée doit être un nombre (en heures)' })
  duration?: number; // durée en heures, optionnel (si absent = suspension permanente)
}