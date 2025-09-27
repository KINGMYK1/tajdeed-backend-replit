import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard, AdminGuard } from './guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    AdminGuard,
    PrismaService,
  ],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule {}