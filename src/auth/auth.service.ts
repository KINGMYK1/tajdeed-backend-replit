import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationCodeService } from './verification-code.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { UserStatus, Role, User as PrismaUser } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  /**
   * ============================================
   * 🔐 INSCRIPTION AVEC CODE À 6 CHIFFRES
   * ============================================
   */
  async register(registerDto: RegisterDto) {
    try {
      const { email, password, name } = registerDto;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'utilisateur
      const user = await this.prismaService.user.create({
        data: {
          email,
          name,
          emailVerified: false,
          status: UserStatus.PENDING_VERIFICATION,
          role: Role.USER,
          accounts: {
            create: {
              accountId: email,
              providerId: 'credential',
              password: hashedPassword,
            },
          },
        },
      });

      // Générer et envoyer le code de vérification à 6 chiffres
      await this.verificationCodeService.generateAndSendCode(
        user.id,
        email,
        'EMAIL_VERIFICATION',
      );

      return {
        message: 'Inscription réussie. Un code de vérification à 6 chiffres a été envoyé à votre email.',
        userId: user.id,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('❌ Erreur lors de l\'inscription:', error as Error);
      throw new BadRequestException('Erreur lors de l\'inscription');
    }
  }

  /**
   * ============================================
   * ✅ VÉRIFICATION EMAIL AVEC CODE À 6 CHIFFRES
   * ============================================
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    try {
      const { email, code } = verifyEmailDto;

      // Vérifier le code à 6 chiffres
      const isValid = await this.verificationCodeService.verifyCode(
        email,
        code,
        'EMAIL',
      );

      if (!isValid) {
        throw new BadRequestException('Code invalide ou expiré');
      }

      // Trouver l'utilisateur
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Mettre à jour le statut de l'utilisateur
      const updatedUser = await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      });

      // Supprimer le code utilisé
      await this.verificationCodeService.deleteUsedCodes(email, 'EMAIL_VERIFICATION');

      // Créer une session pour l'utilisateur (auto-login)
      const session = await this.createUserSession(updatedUser.id);
      const accessToken = this.generateAccessToken(updatedUser.id, session.id);
      const refreshToken = session.sessionToken;

      return {
        message: 'Email vérifié avec succès',
        accessToken,
        refreshToken,
        user: this.mapUser(updatedUser),
      };
    } catch (error: any) {
      this.logger.error('❌ Erreur lors de la vérification:', error as Error);
      throw new BadRequestException(
        error.message || 'Erreur lors de la vérification de l\'email',
      );
    }
  }

  /**
   * ============================================
   * 🔄 RENVOYER UN CODE DE VÉRIFICATION
   * ============================================
   */
  async resendVerificationEmail(resendDto: ResendVerificationDto) {
    try {
      const { email } = resendDto;

      // Vérifier si l'utilisateur existe
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Ne pas révéler que l'utilisateur n'existe pas (sécurité)
        return {
          message: 'Si un compte existe avec cet email, un nouveau code a été envoyé.',
        };
      }

      if (user.emailVerified) {
        throw new BadRequestException('Cet email est déjà vérifié');
      }

      // Générer et envoyer un nouveau code à 6 chiffres
      await this.verificationCodeService.generateAndSendCode(
        user.id,
        email,
        'EMAIL_VERIFICATION',
      );

      return {
        message: 'Un nouveau code de vérification à 6 chiffres a été envoyé à votre email.',
      };
    } catch (error) {
      this.logger.error('❌ Erreur lors du renvoi:', error as Error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors du renvoi du code');
    }
  }

  /**
   * ============================================
   * 🔑 CONNEXION AVEC EMAIL/PASSWORD
   * ============================================
   */
  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // Trouver l'utilisateur
      const user = await this.prismaService.user.findUnique({
        where: { email },
        include: {
          accounts: {
            where: { providerId: 'credential' },
          },
        },
      });

      if (!user || !user.accounts[0]) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Vérifier si l'email est vérifié
      if (!user.emailVerified) {
        throw new UnauthorizedException(
          'Veuillez vérifier votre email avant de vous connecter',
        );
      }

      // Vérifier le statut du compte
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Votre compte a été suspendu ou banni');
      }

      // Vérifier le mot de passe
      const account = user.accounts[0];
      
      if (!account.password) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }
      
      const isPasswordValid = await bcrypt.compare(password, account.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Créer une session
      const session = await this.createUserSession(user.id);
      const accessToken = this.generateAccessToken(user.id, session.id);
      const refreshToken = session.sessionToken;

      return {
        accessToken,
        refreshToken,
        user: this.mapUser(user),
      };
    } catch (error) {
      this.logger.error('❌ Erreur lors de la connexion:', error as Error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Erreur lors de la connexion');
    }
  }

  /**
   * ============================================
   * 📧 DEMANDE RÉINITIALISATION MOT DE PASSE (CODE 6 CHIFFRES)
   * ============================================
   */
  async sendPasswordResetEmail(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      // Trouver l'utilisateur
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      // Ne pas révéler si l'utilisateur existe ou non (sécurité)
      if (!user) {
        return {
          message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.',
        };
      }

      // Générer et envoyer le code de réinitialisation à 6 chiffres
      await this.verificationCodeService.generateAndSendCode(
        user.id,
        email,
        'PASSWORD_RESET',
      );

      return {
        message: 'Un code de réinitialisation à 6 chiffres a été envoyé à votre email.',
      };
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'envoi du code de reset:', error as Error);
      // Silently fail pour ne pas révéler d'informations
      return {
        message: 'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.',
      };
    }
  }

  /**
   * ============================================
   * 🔐 RÉINITIALISATION MOT DE PASSE AVEC CODE 6 CHIFFRES
   * ============================================
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { email, code, newPassword } = resetPasswordDto;

      // Vérifier le code à 6 chiffres
      const isValid = await this.verificationCodeService.verifyCode(
        email,
        code,
        'PASSWORD_RESET',
      );

      if (!isValid) {
        throw new BadRequestException('Code invalide ou expiré');
      }

      // Trouver l'utilisateur
      const user = await this.prismaService.user.findUnique({
        where: { email },
        include: {
          accounts: {
            where: { providerId: 'credential' },
          },
        },
      });

      if (!user || !user.accounts[0]) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Hash du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await this.prismaService.account.update({
        where: { id: user.accounts[0].id },
        data: { password: hashedPassword },
      });

      // Supprimer le code utilisé
      await this.verificationCodeService.deleteUsedCodes(email, 'PASSWORD_RESET');

      return {
        message: 'Mot de passe réinitialisé avec succès',
      };
    } catch (error) {
      this.logger.error('❌ Erreur lors de la réinitialisation:', error as Error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Erreur lors de la réinitialisation du mot de passe');
    }
  }

  /**
   * ============================================
   * 🔄 RAFRAÎCHIR LE TOKEN D'ACCÈS
   * ============================================
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;

      // Valider le refresh token
      const session = await this.prismaService.session.findFirst({
        where: {
          sessionToken: refreshToken,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Refresh token invalide ou expiré');
      }

      // Générer un nouveau access token
      const accessToken = this.generateAccessToken(session.userId, session.id);

      // Mettre à jour la dernière utilisation de la session
      await this.prismaService.session.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      return {
        accessToken,
        refreshToken,
        user: this.mapUser(session.user),
      };
    } catch (error) {
      this.logger.error('❌ Erreur lors du refresh:', error as Error);
      throw new UnauthorizedException('Token de rafraîchissement invalide');
    }
  }

  /**
   * ============================================
   * 🚪 DÉCONNEXION
   * ============================================
   */
  async logout(sessionId: string) {
    try {
      await this.prismaService.session.delete({
        where: { id: sessionId },
      });
    } catch (error) {
      this.logger.error('❌ Erreur lors de la déconnexion:', error as Error);
      // Ne pas lever d'erreur si la session n'existe pas
    }
  }

  /**
   * ============================================
   * ✅ VALIDER UNE SESSION
   * ============================================
   */
  async validateSession(accessToken: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret-key';
      const payload = jwt.verify(accessToken, secret) as any;

      const session = await this.prismaService.session.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        return null;
      }

      return {
        userId: session.userId,
        user: this.mapUser(session.user),
        sessionId: session.id,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * ============================================
   * 👤 RÉCUPÉRER LE PROFIL UTILISATEUR
   * ============================================
   */
  async getMe(sessionId: string) {
    const session = await this.prismaService.session.findFirst({
      where: {
        id: sessionId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session invalide');
    }

    return this.mapUser(session.user);
  }

  async updateUserProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        name: updateProfileDto.name ?? undefined,
        firstName: updateProfileDto.firstName ?? undefined,
        lastName: updateProfileDto.lastName ?? undefined,
        phoneNumber: updateProfileDto.phoneNumber ?? undefined,
        addressLine1: updateProfileDto.addressLine1 ?? undefined,
        addressLine2: updateProfileDto.addressLine2 ?? undefined,
        city: updateProfileDto.city ?? undefined,
        postalCode: updateProfileDto.postalCode ?? undefined,
        country: updateProfileDto.country ?? undefined,
      },
    });

    return {
      message: 'Profil mis à jour',
      user: this.mapUser(updatedUser),
    };
  }

  /**
   * Mapper un utilisateur Prisma vers l'objet exposé au client
   */
  private mapUser(user: PrismaUser) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      postalCode: user.postalCode,
      country: user.country,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * ============================================
   * 🔐 MÉTHODES PRIVÉES - GESTION DES SESSIONS
   * ============================================
   */

  /**
   * Créer une session utilisateur
   */
  private async createUserSession(userId: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 jours

    const sessionToken = this.generateRandomToken();

    return await this.prismaService.session.create({
      data: {
        userId,
        sessionToken,
        expiresAt,
        ipAddress: '',
        userAgent: '',
      },
    });
  }

  /**
   * Générer un access token JWT
   */
  private generateAccessToken(userId: string, sessionId: string): string {
    const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret-key';
    return jwt.sign(
      { sub: userId, sessionId },
      secret,
      { expiresIn: '15m' }, // 15 minutes
    );
  }

  /**
   * Générer un token aléatoire pour le refresh token
   */
  private generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ========================================
  // 🌐 GOOGLE OAUTH
  // ========================================

  private resolveGoogleRedirectUri(): string {
    const configured = this.configService.get<string>('GOOGLE_REDIRECT_URI');
    if (configured) {
      const trimmed = configured.replace(/\/$/, '');
      if (!trimmed.includes('/auth/google/callback')) {
        return trimmed;
      }

      if (trimmed.includes('/api/auth/google/callback')) {
        return trimmed;
      }

      return trimmed.replace('/auth/google/callback', '/api/auth/google/callback');
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const normalizedBase = appUrl.replace(/\/$/, '');
    return `${normalizedBase}/api/auth/google/callback`;
  }

  /**
   * Générer l'URL d'authentification Google OAuth
   */
  getGoogleAuthUrl(): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.resolveGoogleRedirectUri();
    const scope = 'email profile';
    
    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID non configuré');
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  }

  /**
   * Connexion via Google OAuth
   */
  async signInGoogle(code: string) {
    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
      const redirectUri = this.resolveGoogleRedirectUri();

      if (!clientId || !clientSecret) {
        throw new BadRequestException('Configuration Google OAuth manquante');
      }

      // Échanger le code contre un access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new UnauthorizedException('Échec de l\'authentification Google');
      }

      // Récupérer les informations de l'utilisateur
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const googleUser = await userResponse.json();

      // Vérifier si l'utilisateur existe déjà
      let user = await this.prismaService.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        // Créer un nouvel utilisateur
        user = await this.prismaService.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            emailVerified: true, // Google a déjà vérifié l'email
            status: UserStatus.ACTIVE,
            role: Role.USER,
            accounts: {
              create: {
                accountId: googleUser.id,
                providerId: 'google',
              },
            },
          },
        });
      } else {
        // Vérifier si le compte Google est déjà lié
        const googleAccount = await this.prismaService.account.findFirst({
          where: {
            userId: user.id,
            providerId: 'google',
          },
        });

        if (!googleAccount) {
          // Lier le compte Google à l'utilisateur existant
          await this.prismaService.account.create({
            data: {
              userId: user.id,
              accountId: googleUser.id,
              providerId: 'google',
            },
          });
        }
      }

      // Créer une session
      const session = await this.createUserSession(user.id);

      // Générer les tokens
      const accessToken = this.generateAccessToken(user.id, session.id);

      return {
        accessToken,
        refreshToken: session.sessionToken,
        expiresIn: 900,
        user: this.mapUser(user),
      };
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'authentification Google:', error as Error);
      throw new UnauthorizedException('Échec de l\'authentification Google');
    }
  }

  getFrontendOrigin(): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'http://localhost:5174';
    try {
      return new URL(frontendUrl).origin;
    } catch {
      return frontendUrl;
    }
  }

  // ========================================
  // 👑 GESTION DES ADMINISTRATEURS
  // ========================================

  /**
   * Créer un nouvel administrateur
   */
  async createAdmin(createAdminDto: any, creatorRole: string) {
    try {
      const { email, password, name, role } = createAdminDto;

      // Vérifier les permissions
      if (creatorRole === 'ADMIN' && role === 'SUPER_ADMIN') {
        throw new BadRequestException('Seul un SUPER_ADMIN peut créer un autre SUPER_ADMIN');
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'administrateur
      const admin = await this.prismaService.user.create({
        data: {
          email,
          name,
          emailVerified: true, // Les admins sont automatiquement vérifiés
          status: UserStatus.ACTIVE,
          role: role as Role,
          accounts: {
            create: {
              accountId: email,
              providerId: 'credential',
              password: hashedPassword,
            },
          },
        },
      });

      return {
        message: `Administrateur ${role} créé avec succès`,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('❌ Erreur lors de la création de l\'admin:', error as Error);
      throw new BadRequestException('Erreur lors de la création de l\'administrateur');
    }
  }

  /**
   * Lister les administrateurs
   */
  async listAdmins(role?: string) {
    const whereClause: any = {
      role: {
        in: ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
      },
    };

    if (role) {
      whereClause.role = role;
    }

    const admins = await this.prismaService.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      total: admins.length,
      admins,
    };
  }

  /**
   * Modifier le rôle d'un utilisateur
   */
  async updateUserRole(userId: string, newRole: string, adminRole: string) {
    try {
      // Vérifier les permissions
      if (adminRole === 'ADMIN' && newRole === 'SUPER_ADMIN') {
        throw new BadRequestException('Seul un SUPER_ADMIN peut promouvoir au rôle SUPER_ADMIN');
      }

      // Vérifier si l'utilisateur existe
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Empêcher de rétrograder un SUPER_ADMIN si on est ADMIN
      if (user.role === 'SUPER_ADMIN' && adminRole === 'ADMIN') {
        throw new BadRequestException('Seul un SUPER_ADMIN peut modifier le rôle d\'un autre SUPER_ADMIN');
      }

      // Mettre à jour le rôle
      const updatedUser = await this.prismaService.user.update({
        where: { id: userId },
        data: { role: newRole as Role },
      });

      return {
        message: `Rôle mis à jour avec succès`,
        user: this.mapUser(updatedUser),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('❌ Erreur lors de la mise à jour du rôle:', error as Error);
      throw new BadRequestException('Erreur lors de la mise à jour du rôle');
    }
  }

  /**
   * Supprimer un administrateur (rétrogradation en USER)
   */
  async removeAdmin(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Rétrograder en USER
      await this.prismaService.user.update({
        where: { id: userId },
        data: { role: Role.USER },
      });

      return {
        message: 'Administrateur rétrogradé en utilisateur standard',
        userId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('❌ Erreur lors de la suppression de l\'admin:', error as Error);
      throw new BadRequestException('Erreur lors de la suppression de l\'administrateur');
    }
  }

  /**
   * Obtenir les statistiques des utilisateurs
   */
  async getUserStats() {
    const [totalUsers, activeUsers, suspendedUsers, byRole] = await Promise.all([
      this.prismaService.user.count(),
      this.prismaService.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prismaService.user.count({ where: { status: UserStatus.SUSPENDED } }),
      this.prismaService.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    const roleStats = byRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalUsers,
      active: activeUsers,
      suspended: suspendedUsers,
      byRole: roleStats,
    };
  }

  /**
   * Lister les utilisateurs avec filtres
   */
  async listUsers(filters: any) {
    const { role, status, page, limit } = filters;

    const whereClause: any = {};

    if (role) {
      whereClause.role = role;
    }

    if (status) {
      whereClause.status = status;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postalCode: true,
          country: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.user.count({ where: whereClause }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Suspendre un utilisateur
   */
  async suspendUser(userId: string, reason: string, duration?: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      // Empêcher de suspendre un admin
      if (['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        throw new BadRequestException('Impossible de suspendre un administrateur');
      }

      await this.prismaService.user.update({
        where: { id: userId },
        data: { status: UserStatus.SUSPENDED },
      });

      // Supprimer toutes les sessions actives
      await this.prismaService.session.deleteMany({
        where: { userId },
      });

      return {
        message: 'Utilisateur suspendu avec succès',
        userId,
        reason,
        duration,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('❌ Erreur lors de la suspension:', error as Error);
      throw new BadRequestException('Erreur lors de la suspension de l\'utilisateur');
    }
  }

  /**
   * Réactiver un utilisateur
   */
  async activateUser(userId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }

      await this.prismaService.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });

      return {
        message: 'Utilisateur réactivé avec succès',
        userId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('❌ Erreur lors de la réactivation:', error as Error);
      throw new BadRequestException('Erreur lors de la réactivation de l\'utilisateur');
    }
  }
}
