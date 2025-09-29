import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IAuthService, AuthResult, AuthResultExtended, SessionData, GoogleUserInfo } from './interfaces/auth.interface';
import { createBetterAuthConfig } from './auth.config';
import { AppUser, User, Role, UserStatus, VerificationType } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto } from './dto/auth.dto';

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

  // === Nouvelles méthodes pour authentification email/password ===

  /**
   * Inscription d'un nouvel utilisateur avec email et mot de passe
   * Utilise Better Auth pour la gestion des utilisateurs et l'envoi d'emails
   */
  async registerWithEmail(registerDto: RegisterDto): Promise<{ userId: string }> {
    try {
      // Utiliser Better Auth pour l'inscription
      const auth = createBetterAuthConfig(this.configService, this.prismaService);
      
      // Appeler l'API Better Auth pour créer l'utilisateur avec mot de passe
      const result = await auth.api.signUpEmail({
        body: {
          email: registerDto.email,
          password: registerDto.password,
          name: registerDto.name,
          callbackURL: `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/verify-email`,
        },
      });

      if (!result || !result.user) {
        throw new BadRequestException('Erreur lors de la création du compte');
      }

      // Mettre à jour les champs supplémentaires si nécessaire
      if (registerDto.username) {
        await this.prismaService.user.update({
          where: { id: result.user.id },
          data: { 
            username: registerDto.username,
            role: Role.USER,
            status: UserStatus.PENDING_VERIFICATION,
          },
        });
      }

      return { userId: result.user.id };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Erreur lors de l\'inscription: ' + errorMessage);
    }
  }

  /**
   * Connexion avec email et mot de passe
   * Vérifie que l'email est confirmé avant d'autoriser la connexion
   */
  async loginWithEmail(loginDto: LoginDto): Promise<AuthResultExtended> {
    try {
      // Utiliser Better Auth pour la connexion
      const auth = createBetterAuthConfig(this.configService, this.prismaService);
      
      // Appeler l'API Better Auth pour la connexion
      const result = await auth.api.signInEmail({
        body: {
          email: loginDto.email,
          password: loginDto.password,
        },
      });

      if (!result || !result.user || !result.session) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Vérifier le statut du compte dans notre système
      const user = await this.prismaService.user.findUnique({
        where: { id: result.user.id },
      });

      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      if (user.status === UserStatus.BANNED) {
        throw new UnauthorizedException('Votre compte a été banni. Contactez le support.');
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Votre compte est temporairement suspendu.');
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException('Veuillez vérifier votre email avant de vous connecter.');
      }

      // Générer nos tokens personnalisés pour compatibilité avec l'ancien système
      const accessToken = this.generateAccessToken(user.id, result.session.id);
      const refreshToken = result.session.token;

      return {
        accessToken,
        refreshToken,
        user,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException('Erreur lors de la connexion: ' + errorMessage);
    }
  }

  /**
   * Vérifier un email avec le token de vérification
   */
  async verifyEmail(token: string): Promise<{ autoSignIn: boolean; accessToken?: string; refreshToken?: string }> {
    try {
      // Utiliser Better Auth pour la vérification d'email
      const auth = createBetterAuthConfig(this.configService, this.prismaService);
      
      // Appeler l'API Better Auth pour vérifier l'email
      const result = await auth.api.verifyEmail({
        query: { token },
      });

      if (!result || !result.user) {
        throw new BadRequestException('Token de vérification invalide ou expiré');
      }

      // Mettre à jour le statut de l'utilisateur dans notre système
      await this.prismaService.user.update({
        where: { id: result.user.id },
        data: {
          status: UserStatus.ACTIVE,
          emailVerified: true,
        },
      });

      // Si autoSignInAfterVerification est activé, Better Auth créera automatiquement une session
      if (result.session) {
        const accessToken = this.generateAccessToken(result.user.id, result.session.id);
        const refreshToken = result.session.token;

        return {
          autoSignIn: true,
          accessToken,
          refreshToken,
        };
      }

      return {
        autoSignIn: false,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Erreur lors de la vérification: ' + errorMessage);
    }
  }

  /**
   * Renvoyer un email de vérification
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Ne pas révéler si l'email existe ou non pour la sécurité
        return;
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email déjà vérifié');
      }

      // Supprimer les anciens tokens
      await this.prismaService.verificationToken.deleteMany({
        where: {
          identifier: email,
          type: VerificationType.EMAIL_VERIFICATION,
        },
      });

      // Créer un nouveau token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 heure

      await this.prismaService.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: expiresAt,
          type: VerificationType.EMAIL_VERIFICATION,
        },
      });

      // Envoyer l'email
      await this.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Silently fail pour ne pas révéler d'informations
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // Utiliser Better Auth pour envoyer l'email de reset
      const auth = createBetterAuthConfig(this.configService, this.prismaService);
      
      // Appeler l'API Better Auth pour demander un reset de mot de passe
      await auth.api.forgetPassword({
        body: {
          email,
          callbackURL: `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/reset-password`,
        },
      });

      // Better Auth gère automatiquement l'envoi de l'email via notre configuration
    } catch (error) {
      // Silently fail pour ne pas révéler d'informations
      console.error('Erreur lors de l\'envoi de l\'email de reset:', error);
    }
  }

  /**
   * Réinitialiser le mot de passe avec un token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Utiliser Better Auth pour réinitialiser le mot de passe
      const auth = createBetterAuthConfig(this.configService, this.prismaService);
      
      // Appeler l'API Better Auth pour réinitialiser le mot de passe
      const result = await auth.api.resetPassword({
        body: {
          token,
          password: newPassword,
        },
      });

      if (!result || !result.user) {
        throw new BadRequestException('Token de réinitialisation invalide ou expiré');
      }

      // Better Auth gère automatiquement l'invalidation des sessions existantes
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException('Erreur lors de la réinitialisation: ' + errorMessage);
    }
  }

  // === Méthodes utilitaires privées ===

  /**
   * Vérifier un mot de passe (temporaire, à remplacer par Better Auth)
   */
  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    // TODO: Intégrer avec Better Auth pour la vérification du mot de passe
    // Pour l'instant, simulation
    return true;
  }

  /**
   * Créer une session utilisateur
   */
  private async createUserSession(userId: string): Promise<any> {
    return await this.prismaService.session.create({
      data: {
        userId,
        sessionToken: 'temp',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      },
    });
  }

  /**
   * Envoyer un email de vérification
   */
  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const { sendEmail } = await import('../utils/replitmail');
      const verificationUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/verify-email?token=${token}`;
      
      await sendEmail({
        to: email,
        subject: 'Vérifiez votre adresse email - Tajdeed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Bienvenue sur Tajdeed !</h1>
            <p>Bonjour,</p>
            <p>Merci de vous être inscrit(e) sur Tajdeed, votre nouvelle plateforme de vente entre particuliers.</p>
            <p>Pour finaliser votre inscription et sécuriser votre compte, veuillez vérifier votre adresse email :</p>
            <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Vérifier mon email</a>
            <p>Ce lien expirera dans 1 heure pour votre sécurité.</p>
            <p>Une fois vérifiée, vous pourrez :</p>
            <ul>
              <li>Publier vos annonces</li>
              <li>Acheter en toute sécurité</li>
              <li>Échanger avec la communauté</li>
            </ul>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Équipe Tajdeed</p>
          </div>
        `,
        text: `Bienvenue sur Tajdeed !\n\nMerci de vous être inscrit(e) sur Tajdeed.\n\nPour finaliser votre inscription, cliquez sur ce lien :\n${verificationUrl}\n\nCe lien expirera dans 1 heure.\n\nÉquipe Tajdeed`,
      });
    } catch (error) {
      console.error('Erreur envoi email verification:', error);
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  private async sendPasswordResetEmailNotification(email: string, token: string): Promise<void> {
    try {
      const { sendEmail } = await import('../utils/replitmail');
      const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;
      
      await sendEmail({
        to: email,
        subject: 'Réinitialisation de votre mot de passe - Tajdeed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Réinitialisation de mot de passe</h1>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur Tajdeed.</p>
            <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Réinitialiser mon mot de passe</a>
            <p>Ce lien expirera dans 1 heure pour votre sécurité.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Équipe Tajdeed</p>
          </div>
        `,
        text: `Réinitialisation de votre mot de passe - Tajdeed\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur ce lien :\n${resetUrl}\n\nCe lien expirera dans 1 heure.\n\nÉquipe Tajdeed`,
      });
    } catch (error) {
      console.error('Erreur envoi email reset password:', error);
    }
  }
}