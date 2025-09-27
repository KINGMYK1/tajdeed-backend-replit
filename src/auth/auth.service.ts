import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IAuthService, AuthResult, SessionData, GoogleUserInfo } from './interfaces/auth.interface';
import { createBetterAuthConfig } from './auth.config';
import { AppUser, Role } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService implements IAuthService {
  private betterAuth;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.betterAuth = createBetterAuthConfig(configService, prismaService);
  }

  async signInGoogle(code: string): Promise<AuthResult> {
    try {
      // Pour l'instant, simulation de l'auth Google
      // TODO: Implémenter l'échange du code avec Google OAuth
      const mockGoogleUser = {
        id: `google_${Date.now()}`,
        email: 'test@example.com',
        name: 'Test User',
      };

      // Créer ou récupérer l'utilisateur dans notre base
      const user = await this.findOrCreateUser(mockGoogleUser);

      // Créer une session device d'abord
      const deviceSession = await this.createDeviceSession(user.id);
      
      // Générer des tokens sécurisés
      const accessToken = this.generateAccessToken(user.id, deviceSession.id);
      const refreshToken = this.generateRefreshHash();
      
      // Mettre à jour avec le vrai refresh token
      await this.prismaService.deviceSession.update({
        where: { id: deviceSession.id },
        data: { refreshHash: this.hashRefreshToken(refreshToken) },
      });

      return {
        accessToken,
        refreshToken,
        user,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Erreur lors de l\'authentification Google: ' + errorMessage);
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Vérifier le refresh token haché dans notre base
      const hashedRefreshToken = this.hashRefreshToken(refreshToken);
      const deviceSession = await this.prismaService.deviceSession.findFirst({
        where: { refreshHash: hashedRefreshToken },
        include: { user: true },
      });

      if (!deviceSession) {
        throw new UnauthorizedException('Refresh token invalide');
      }

      // Vérifier la validité (TTL)
      const expiryDate = new Date(deviceSession.createdAt);
      expiryDate.setDate(expiryDate.getDate() + deviceSession.ttlDays);
      
      if (new Date() > expiryDate) {
        await this.prismaService.deviceSession.delete({
          where: { id: deviceSession.id },
        });
        throw new UnauthorizedException('Refresh token expiré');
      }

      // Générer un nouveau token avec session ID
      const newAccessToken = this.generateAccessToken(deviceSession.userId, deviceSession.id);

      // Mettre à jour la session avec nouveau refresh token
      const newRefreshToken = this.generateRefreshHash();
      await this.prismaService.deviceSession.update({
        where: { id: deviceSession.id },
        data: { refreshHash: this.hashRefreshToken(newRefreshToken) },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: deviceSession.user,
        expiresIn: 900,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException('Impossible de rafraîchir le token: ' + errorMessage);
    }
  }

  async logout(sessionId: string): Promise<void> {
    try {
      // Supprimer la session par ID (cohérent avec AuthGuard)
      await this.prismaService.deviceSession.delete({
        where: { id: sessionId },
      });
    } catch (error) {
      // Silently fail logout errors
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  async getMe(sessionId: string): Promise<AppUser | null> {
    try {
      // Vérifier la session via Better Auth
      const session = await this.validateSession(sessionId);
      if (!session) {
        return null;
      }

      return session.user;
    } catch (error) {
      return null;
    }
  }

  async validateSession(accessToken: string): Promise<SessionData | null> {
    try {
      // Vérifier JWT et extraire payload
      const tokenData = this.verifyAccessToken(accessToken);
      if (!tokenData) {
        return null;
      }

      // Vérifier que la session existe et correspond au token
      const deviceSession = await this.prismaService.deviceSession.findFirst({
        where: { 
          id: tokenData.sessionId,
          userId: tokenData.userId 
        },
        include: { user: true },
      });

      if (!deviceSession) {
        return null;
      }

      return {
        sessionId: deviceSession.id,
        userId: deviceSession.userId,
        user: deviceSession.user,
        expiresAt: new Date(Date.now() + 900000), // 15 minutes
      };
    } catch (error) {
      return null;
    }
  }

  private async findOrCreateUser(googleUser: GoogleUserInfo): Promise<AppUser> {
    let user = await this.prismaService.appUser.findFirst({
      where: { username: googleUser.email },
    });

    if (!user) {
      user = await this.prismaService.appUser.create({
        data: {
          id: googleUser.id,
          username: googleUser.email,
          role: Role.USER,
        },
      });
    }

    return user;
  }

  private async createDeviceSession(userId: string): Promise<any> {
    return await this.prismaService.deviceSession.create({
      data: {
        userId,
        refreshHash: 'temp', // Sera mis à jour après génération du token
        ttlDays: 30,
      },
    });
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshHash(): string {
    return crypto.randomUUID() + '.' + Date.now();
  }

  private generateAccessToken(userId: string, sessionId: string): string {
    const secret = this.configService.get<string>('BETTER_AUTH_SECRET') || 'dev-secret';
    const payload = {
      sub: userId,
      jti: sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };
    return jwt.sign(payload, secret);
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const secret = this.configService.get<string>('BETTER_AUTH_SECRET') || 'dev-secret';
      const decoded = jwt.verify(token, secret) as any;
      return decoded.sub || null;
    } catch {
      return null;
    }
  }

  private verifyAccessToken(token: string): { userId: string; sessionId: string } | null {
    try {
      const secret = this.configService.get<string>('BETTER_AUTH_SECRET') || 'dev-secret';
      const decoded = jwt.verify(token, secret) as any;
      return {
        userId: decoded.sub,
        sessionId: decoded.jti,
      };
    } catch {
      return null;
    }
  }
}