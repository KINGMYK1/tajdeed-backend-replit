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
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.prismaService.user.findFirst({
        where: {
          OR: [
            { email: registerDto.email },
            { username: registerDto.username },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === registerDto.email) {
          throw new BadRequestException('Un compte avec cette adresse email existe déjà');
        }
        if (existingUser.username === registerDto.username) {
          throw new BadRequestException('Ce nom d\'utilisateur est déjà pris');
        }
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(registerDto.password, 12);

      // Créer l'utilisateur
      const user = await this.prismaService.user.create({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          username: registerDto.username || registerDto.email.split('@')[0],
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          role: Role.USER,
          // Note: Le mot de passe sera géré par Better Auth
        },
      });

      // Créer un token de vérification d'email
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 heure

      await this.prismaService.verificationToken.create({
        data: {
          identifier: user.email,
          token: verificationToken,
          expires: expiresAt,
          type: VerificationType.EMAIL_VERIFICATION,
        },
      });

      // Envoyer l'email de vérification
      await this.sendVerificationEmail(user.email, verificationToken);

      return { userId: user.id };
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
      // Trouver l'utilisateur par email
      const user = await this.prismaService.user.findUnique({
        where: { email: loginDto.email },
      });

      if (!user) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Vérifier le statut du compte
      if (user.status === UserStatus.BANNED) {
        throw new UnauthorizedException('Votre compte a été banni. Contactez le support.');
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Votre compte est temporairement suspendu.');
      }

      if (!user.emailVerified) {
        throw new UnauthorizedException('Veuillez vérifier votre email avant de vous connecter.');
      }

      // Vérifier le mot de passe avec Better Auth (pour l'instant simulation)
      // TODO: Intégrer avec Better Auth pour la vérification du mot de passe
      const isPasswordValid = await this.verifyPassword(loginDto.password, user.id);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Créer une session
      const session = await this.createUserSession(user.id);
      
      // Générer les tokens
      const accessToken = this.generateAccessToken(user.id, session.id);
      const refreshToken = this.generateRefreshHash();

      // Mettre à jour la session avec le refresh token
      await this.prismaService.session.update({
        where: { id: session.id },
        data: { 
          sessionToken: refreshToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        },
      });

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
      // Trouver le token de vérification
      const verificationToken = await this.prismaService.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken || verificationToken.expires < new Date()) {
        throw new BadRequestException('Token de vérification invalide ou expiré');
      }

      if (verificationToken.type !== VerificationType.EMAIL_VERIFICATION) {
        throw new BadRequestException('Type de token incorrect');
      }

      // Trouver et mettre à jour l'utilisateur
      const user = await this.prismaService.user.findUnique({
        where: { email: verificationToken.identifier },
      });

      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      // Mettre à jour l'utilisateur
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      });

      // Supprimer le token utilisé
      await this.prismaService.verificationToken.delete({
        where: { token },
      });

      // Auto-connexion après vérification
      const session = await this.createUserSession(user.id);
      const accessToken = this.generateAccessToken(user.id, session.id);
      const refreshToken = this.generateRefreshHash();

      await this.prismaService.session.update({
        where: { id: session.id },
        data: { 
          sessionToken: refreshToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        autoSignIn: true,
        accessToken,
        refreshToken,
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
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Ne pas révéler si l'email existe ou non
        return;
      }

      // Créer un token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 heure

      // Supprimer les anciens tokens de reset
      await this.prismaService.verificationToken.deleteMany({
        where: {
          identifier: email,
          type: VerificationType.PASSWORD_RESET,
        },
      });

      await this.prismaService.verificationToken.create({
        data: {
          identifier: email,
          token: resetToken,
          expires: expiresAt,
          type: VerificationType.PASSWORD_RESET,
        },
      });

      // Envoyer l'email de reset
      await this.sendPasswordResetEmailNotification(email, resetToken);
    } catch (error) {
      // Silently fail pour ne pas révéler d'informations
    }
  }

  /**
   * Réinitialiser le mot de passe avec un token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Vérifier le token
      const resetToken = await this.prismaService.verificationToken.findUnique({
        where: { token },
      });

      if (!resetToken || resetToken.expires < new Date()) {
        throw new BadRequestException('Token de réinitialisation invalide ou expiré');
      }

      if (resetToken.type !== VerificationType.PASSWORD_RESET) {
        throw new BadRequestException('Type de token incorrect');
      }

      // Trouver l'utilisateur
      const user = await this.prismaService.user.findUnique({
        where: { email: resetToken.identifier },
      });

      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Mettre à jour le mot de passe (via Better Auth)
      // TODO: Intégrer avec Better Auth pour la mise à jour du mot de passe
      
      // Supprimer le token utilisé
      await this.prismaService.verificationToken.delete({
        where: { token },
      });

      // Invalider toutes les sessions existantes pour ce user
      await this.prismaService.session.deleteMany({
        where: { userId: user.id },
      });

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