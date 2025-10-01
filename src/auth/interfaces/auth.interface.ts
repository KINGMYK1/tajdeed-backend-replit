import { User } from '@prisma/client';
import { RegisterDto, LoginDto } from '../dto/auth.dto';

export interface IAuthService {
  // Méthodes existantes
  signInGoogle(code: string): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  logout(sessionId: string): Promise<void>;
  getMe(sessionId: string): Promise<User | null>;
  validateSession(accessToken: string): Promise<SessionData | null>;

  // Nouvelles méthodes pour email/password
  registerWithEmail(registerDto: RegisterDto): Promise<{ userId: string }>;
  loginWithEmail(loginDto: LoginDto): Promise<AuthResultExtended>;
  verifyEmail(token: string): Promise<{ autoSignIn: boolean; accessToken?: string; refreshToken?: string }>;
  resendVerificationEmail(email: string): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface AuthResultExtended extends AuthResult {
  // Extension pour compatibilité future
}

export interface SessionData {
  sessionId: string;
  userId: string;
  user: User;
  expiresAt: Date;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}