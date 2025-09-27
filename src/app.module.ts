import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './common/config.module';
import { PrismaService } from './prisma/prisma.service';
import { HelmetMiddleware } from './common/middlewares/helmet.middleware';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware';

@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HelmetMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}