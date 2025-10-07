import { Module } from '@nestjs/common';
import { TestPrismaService } from './test-prisma.service';
import { PrismaService } from '../src/prisma/prisma.service';

@Module({
  providers: [
    {
      provide: PrismaService,
      useClass: TestPrismaService,
    },
    TestPrismaService,
  ],
  exports: [PrismaService, TestPrismaService],
})
export class TestPrismaModule {}