import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './common/config.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ModerationModule } from './moderation/moderation.module';
import { HelmetMiddleware } from './common/middlewares/helmet.middleware';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware';
import { AuthRateLimitMiddleware } from './common/middlewares/auth-rate-limit.middleware';

@Module({
  imports: [ConfigModule, AuthModule, ModerationModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middlewares généraux
    consumer.apply(HelmetMiddleware, RateLimitMiddleware).forRoutes('*');
    
    // Rate limiting spécifique pour l'authentification (5 tentatives / 15 min)
    consumer.apply(AuthRateLimitMiddleware).forRoutes(
      'auth/google',
      'auth/refresh',
      'auth/login',
      'auth/register',
      'auth/forgot-password',
      'auth/reset-password',
      'auth/verify-email',
    );
  }
}