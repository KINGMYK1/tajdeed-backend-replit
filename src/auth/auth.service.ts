import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IAuthService, AuthResult, SessionData, GoogleUserInfo } from './interfaces/auth.interface';
import { createBetterAuthConfig } from './auth.config';
import { AppUser, Role } from '@prisma/client';

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

      // Générer des tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshHash();

      // Créer une session device
      await this.createDeviceSession(user.id, refreshToken);

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
      // Vérifier le refresh token dans notre base
      const deviceSession = await this.prismaService.deviceSession.findFirst({
        where: { refreshHash: refreshToken },
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

      // Générer un nouveau token
      const newAccessToken = this.generateAccessToken(deviceSession.userId);

      // Mettre à jour la session
      const newRefreshHash = this.generateRefreshHash();
      await this.prismaService.deviceSession.update({
        where: { id: deviceSession.id },
        data: { refreshHash: newRefreshHash },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshHash,
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
      // Supprimer la session de notre base
      await this.prismaService.deviceSession.deleteMany({
        where: { refreshHash: sessionId },
      });

      // Session supprimée de notre base de données
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
      // Décoder le token simple (en production, utiliser JWT)
      const userId = this.extractUserIdFromToken(accessToken);
      if (!userId) {
        return null;
      }

      // Vérifier que la session existe
      const deviceSession = await this.prismaService.deviceSession.findFirst({
        where: { userId },
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

  private async createDeviceSession(userId: string, accessToken: string): Promise<any> {
    const refreshHash = this.generateRefreshHash();
    
    return await this.prismaService.deviceSession.create({
      data: {
        userId,
        refreshHash,
        ttlDays: 30,
      },
    });
  }

  private generateRefreshHash(): string {
    return crypto.randomUUID() + '.' + Date.now();
  }

  private generateAccessToken(userId: string): string {
    // Simple token pour dev (en production, utiliser JWT)
    return `access_${userId}_${Date.now()}`;
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const parts = token.split('_');
      return parts.length >= 2 ? parts[1] : null;
    } catch {
      return null;
    }
  }
}