import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Req, 
  HttpStatus, 
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { 
  GoogleAuthDto, 
  RefreshTokenDto, 
  AuthResponseDto, 
  UserProfileDto,
  RegisterDto,
  LoginDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  AuthResponseExtendedDto
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async signInGoogle(@Body() googleAuthDto: GoogleAuthDto): Promise<AuthResponseDto> {
    const result = await this.authService.signInGoogle(googleAuthDto.code);
    
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
      },
      expiresIn: result.expiresIn,
    };
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request) {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      throw new BadRequestException('Code d\'autorisation manquant');
    }

    const result = await this.authService.signInGoogle(code);
    
    // En production, rediriger vers le frontend avec les tokens
    return {
      message: 'Authentification réussie',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
      },
      expiresIn: result.expiresIn,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request): Promise<void> {
    const sessionId = req.session?.id;
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: Request): Promise<UserProfileDto> {
    const user = req.user;
    
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // === Nouveaux endpoints pour authentification email/password ===

  /**
   * Inscription d'un nouvel utilisateur avec email et mot de passe
   * Envoie automatiquement un email de vérification
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<{ message: string; userId: string }> {
    const result = await this.authService.registerWithEmail(registerDto);
    
    return {
      message: 'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.',
      userId: result.userId,
    };
  }

  /**
   * Connexion avec email et mot de passe
   * Retourne une erreur si l'email n'est pas vérifié
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseExtendedDto> {
    const result = await this.authService.loginWithEmail(loginDto);
    
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        username: result.user.username || result.user.email,
        role: result.user.role,
      },
      expiresIn: result.expiresIn,
      emailVerified: result.user.emailVerified,
      status: result.user.status,
    };
  }

  /**
   * Vérification d'email avec token
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string; accessToken?: string; refreshToken?: string }> {
    const result = await this.authService.verifyEmail(verifyEmailDto.token);
    
    if (result.autoSignIn) {
      return {
        message: 'Email vérifié avec succès. Vous êtes maintenant connecté.',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    }
    
    return {
      message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  /**
   * Renvoyer un email de vérification
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendDto: ResendVerificationDto): Promise<{ message: string }> {
    await this.authService.resendVerificationEmail(resendDto.email);
    
    return {
      message: 'Email de vérification renvoyé avec succès.',
    };
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() resetRequestDto: ResetPasswordRequestDto): Promise<{ message: string }> {
    await this.authService.sendPasswordResetEmail(resetRequestDto.email);
    
    return {
      message: 'Si l\'adresse email existe, un lien de réinitialisation a été envoyé.',
    };
  }

  /**
   * Réinitialisation de mot de passe avec token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    
    return {
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }
}