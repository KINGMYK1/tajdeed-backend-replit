import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './common/config.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { HelmetMiddleware } from './common/middlewares/helmet.middleware';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware';
import { AuthRateLimitMiddleware } from './common/middlewares/auth-rate-limit.middleware';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middlewares généraux
    consumer.apply(HelmetMiddleware, RateLimitMiddleware).forRoutes('*');
    
    // Rate limiting spécifique pour l'authentification
    consumer.apply(AuthRateLimitMiddleware).forRoutes('auth/google', 'auth/refresh');
  }
}