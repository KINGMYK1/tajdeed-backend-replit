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
import { GoogleAuthDto, RefreshTokenDto, AuthResponseDto, UserProfileDto } from './dto/auth.dto';

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
}