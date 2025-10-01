import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Moderation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    const email = `admin-test-${Date.now()}@example.com`;
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'AdminPass123!', name: 'Admin Test' });
    
    const adminId = regRes.body.userId;
    await prisma.user.update({
      where: { id: adminId },
      data: { emailVerified: true, status: 'ACTIVE', role: 'ADMIN' },
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'AdminPass123!' });
    adminToken = loginRes.body.accessToken;

    const userEmail = `user-test-${Date.now()}@example.com`;
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, password: 'UserPass123!', name: 'Test User' });
    userId = userRes.body.userId;
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
    await app.close();
  });

  it('should create moderation action', () => {
    return request(app.getHttpServer())
      .post('/moderation/action')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId,
        action: 'WARNING',
        reason: 'Test warning',
      })
      .expect(201);
  });

  it('should get user history', () => {
    return request(app.getHttpServer())
      .get(`/moderation/user/${userId}/history`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('should get moderation stats', () => {
    return request(app.getHttpServer())
      .get('/moderation/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
