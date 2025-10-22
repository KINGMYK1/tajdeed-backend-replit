import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './common/config.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ModerationModule } from './moderation/moderation.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { ProfilesModule } from './profiles/profiles.module';
import { HelmetMiddleware } from './common/middlewares/helmet.middleware';
import { RequestLoggerMiddleware } from './common/middlewares/request-logger.middleware';

@Module({
  imports: [ConfigModule, AuthModule, ModerationModule, MarketplaceModule, ProfilesModule],
  providers: [PrismaService, RequestLoggerMiddleware, HelmetMiddleware],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware, HelmetMiddleware).forRoutes('*');
  }
}