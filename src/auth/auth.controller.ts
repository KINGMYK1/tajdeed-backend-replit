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
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard, AdminGuard } from './guards/auth.guard';
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

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ResetPasswordRequestDto) {
    return this.authService.sendPasswordResetEmail({ email: forgotPasswordDto.email });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth() {
    const googleAuthUrl = this.authService.getGoogleAuthUrl();
    return {
      url: googleAuthUrl,
      message: 'Redirigez l utilisateur vers cette URL pour se connecter avec Google'
    };
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallback(@Query('code') code: string, @Query('state') state?: string) {
    if (!code) {
      throw new BadRequestException('Code d autorisation Google manquant');
    }
    return this.authService.signInGoogle(code);
  }

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
}
