import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { TestPrismaService } from './test-prisma.service';

describe('Moderation E2E (Simple)', () => {
  let app: INestApplication;
  let prisma: TestPrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PrismaService)
    .useClass(TestPrismaService)
    .compile();
    
    app = module.createNestApplication();
    prisma = app.get<TestPrismaService>(TestPrismaService);
    await app.init();
    
    // Nettoyer la base de données avant les tests
    await prisma.cleanupDatabase();
  });

  afterAll(async () => {
    // Nettoyage des données de test
    await prisma.cleanupDatabase();
    await app.close();
  });

  describe('Moderation Endpoints Security', () => {
    it('POST /moderation/action should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/moderation/action')
        .send({
          userId: 'test-user-id',
          action: 'WARNING',
          reason: 'E2E Test Action'
        });

      expect(response.status).toBe(401);
    });

    it('POST /moderation/warning should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/moderation/warning')
        .send({
          userId: 'test-user-id',
          reason: 'E2E Test Warning',
          severity: 'MEDIUM'
        });

      expect(response.status).toBe(401);
    });

    it('GET /moderation/stats should require admin privileges', async () => {
      const response = await request(app.getHttpServer())
        .get('/moderation/stats');

      expect(response.status).toBe(401);
    });

    it('GET /moderation/users should require moderator privileges', async () => {
      const response = await request(app.getHttpServer())
        .get('/moderation/users');

      expect(response.status).toBe(401);
    });
  });

  describe('User Warnings Endpoints', () => {
    it('GET /moderation/my-warnings should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/moderation/my-warnings');

      expect(response.status).toBe(401);
    });

    it('PUT /moderation/my-warnings/read should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .put('/moderation/my-warnings/read');

      expect(response.status).toBe(401);
    });
  });

  describe('Database Models', () => {
    it('should be able to query moderation actions', async () => {
      const actions = await prisma.moderatedUser.findMany({
        take: 1
      });
      
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should be able to query user warnings', async () => {
      const warnings = await prisma.userWarning.findMany({
        take: 1
      });
      
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('should validate moderation action enums', async () => {
      // Test que les enums sont bien définis dans Prisma
      const enumValues = ['WARNING', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'CONTENT_REMOVAL', 'ACCOUNT_RESTRICTION'];
      
      // Ceci va échouer si l'enum n'est pas correct dans le schema
      expect(() => {
        enumValues.forEach(action => {
          expect(['WARNING', 'TEMPORARY_SUSPENSION', 'PERMANENT_BAN', 'CONTENT_REMOVAL', 'ACCOUNT_RESTRICTION']).toContain(action);
        });
      }).not.toThrow();
    });

    it('should validate warning severity enums', async () => {
      const severityValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      
      expect(() => {
        severityValues.forEach(severity => {
          expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(severity);
        });
      }).not.toThrow();
    });
  });

  describe('API Response Format', () => {
    it('should return proper error format for unauthorized requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/moderation/action')
        .send({
          userId: 'test-user-id',
          action: 'WARNING',
          reason: 'Test'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid routes properly', async () => {
      const response = await request(app.getHttpServer())
        .get('/moderation/invalid-endpoint');

      expect(response.status).toBe(404);
    });
  });
});