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
  Put,
  Param,
  Delete,
  Query,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard, AdminGuard } from './guards/auth.guard';
import { Public } from './decorators/public.decorator';
import {
  RefreshTokenDto,
  RegisterDto,
  LoginDto,
  ResetPasswordRequestDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  GoogleAuthDto,
  CreateAdminDto,
  UpdateUserRoleDto,
  SuspendUserDto,
  UpdateProfileDto,
} from './dto/auth.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  sessionId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest) {
    const sessionId = req.sessionId;
    if (sessionId) {
      await this.authService.logout(sessionId);
    }
    return { message: 'Déconnexion réussie' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    const sessionId = req.sessionId;
    if (!sessionId) {
      return req.user;
    }
    return this.authService.getMe(sessionId);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateUserProfile(req.user.id, updateProfileDto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ResetPasswordRequestDto) {
    return this.authService.sendPasswordResetEmail({ email: forgotPasswordDto.email });
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Get('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth() {
    const googleAuthUrl = this.authService.getGoogleAuthUrl();
    return {
      url: googleAuthUrl,
      message: 'Redirigez l utilisateur vers cette URL pour se connecter avec Google'
    };
  }

  @Public()
  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(@Query('code') code: string, @Query('state') state: string | undefined, @Res() res: Response) {
    if (!code) {
      const html = this.buildGoogleOAuthResponse('GOOGLE_OAUTH_ERROR', { error: 'Code d autorisation Google manquant' });
      return res.status(HttpStatus.BAD_REQUEST).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    }

    try {
      const authResult = await this.authService.signInGoogle(code);
      const html = this.buildGoogleOAuthResponse('GOOGLE_OAUTH_SUCCESS', authResult);
      return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (error: any) {
      const message = error?.message || 'Échec de l authentification Google';
      const html = this.buildGoogleOAuthResponse('GOOGLE_OAUTH_ERROR', { error: message });
      return res.status(HttpStatus.UNAUTHORIZED).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    }
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async signInGoogle(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.signInGoogle(googleAuthDto.code);
  }

  @Post('admin/create')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() createAdminDto: CreateAdminDto, @Req() req: AuthenticatedRequest) {
    const creatorRole = (req as any).user?.role;
    return this.authService.createAdmin(createAdminDto, creatorRole);
  }

  @Get('admin/list')
  @UseGuards(AuthGuard, AdminGuard)
  async listAdmins(@Query('role') role?: string) {
    return this.authService.listAdmins(role);
  }

  @Put('admin/user/:userId/role')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async updateUserRole(@Param('userId') userId: string, @Body() updateRoleDto: UpdateUserRoleDto, @Req() req: AuthenticatedRequest) {
    const adminRole = (req as any).user?.role;
    return this.authService.updateUserRole(userId, updateRoleDto.role, adminRole);
  }

  @Delete('admin/:userId')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async removeAdmin(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    const adminRole = (req as any).user?.role;
    if (adminRole !== 'SUPER_ADMIN') {
      throw new BadRequestException('Seuls les SUPER_ADMIN peuvent supprimer des admins');
    }
    return this.authService.removeAdmin(userId);
  }

  @Get('admin/stats')
  @UseGuards(AuthGuard, AdminGuard)
  async getUserStats() {
    return this.authService.getUserStats();
  }

  @Get('admin/users')
  @UseGuards(AuthGuard, AdminGuard)
  async listUsers(@Query('role') role?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.authService.listUsers({ role, status, page: pageNum, limit: limitNum });
  }

  @Put('admin/user/:userId/suspend')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async suspendUser(@Param('userId') userId: string, @Body() suspendDto: SuspendUserDto) {
    return this.authService.suspendUser(userId, suspendDto.reason, suspendDto.duration);
  }

  @Put('admin/user/:userId/activate')
  @UseGuards(AuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('userId') userId: string) {
    return this.authService.activateUser(userId);
  }

  private buildGoogleOAuthResponse(type: 'GOOGLE_OAUTH_SUCCESS' | 'GOOGLE_OAUTH_ERROR', data: any): string {
    const origin = this.authService.getFrontendOrigin();
    const serialized = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    const messageKey = type === 'GOOGLE_OAUTH_SUCCESS' ? 'payload' : 'error';

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>Google OAuth</title></head><body><script>(function(){var data=${serialized};var targetOrigin='${origin}';if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'${type}',${messageKey}:data},targetOrigin);}window.close();})();</script><p>Authentification Google terminée. Vous pouvez fermer cette fenêtre.</p></body></html>`;
  }
}
