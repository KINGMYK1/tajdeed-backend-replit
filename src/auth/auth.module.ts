import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard, AdminGuard } from './guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationCodeService } from './verification-code.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: '15m', // Access token expire après 15 minutes
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    AdminGuard,
    PrismaService,
    VerificationCodeService,
    JwtStrategy,
  ],
  exports: [AuthService, AuthGuard, AdminGuard, VerificationCodeService, JwtStrategy, PassportModule],
})
export class AuthModule {}