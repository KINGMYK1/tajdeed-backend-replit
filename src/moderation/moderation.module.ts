import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard, AdminGuard } from '../auth/guards/auth.guard';
import { VerificationCodeService } from '../auth/verification-code.service';
import { ConfigModule } from '@nestjs/config';

/**
 * Module de modération pour Tajdeed
 * 
 * Fournit:
 * - Contrôleur pour les endpoints de modération
 * - Service de logique métier de modération
 * - Guards d'authentification et d'autorisation
 * - Intégration avec Prisma pour la base de données
 */
@Module({
  imports: [ConfigModule],
  controllers: [ModerationController],
  providers: [
    ModerationService,
    PrismaService,
    AuthService,
    VerificationCodeService,
    AuthGuard,
    AdminGuard,
  ],
  exports: [ModerationService],
})
export class ModerationModule {}