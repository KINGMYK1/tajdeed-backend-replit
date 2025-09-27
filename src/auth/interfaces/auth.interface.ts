import { AppUser } from '@prisma/client';

export interface IAuthService {
  signInGoogle(code: string): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  logout(sessionId: string): Promise<void>;
  getMe(sessionId: string): Promise<AppUser | null>;
  validateSession(accessToken: string): Promise<SessionData | null>;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AppUser;
  expiresIn: number;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  user: AppUser;
  expiresAt: Date;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}