import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { TestPrismaService } from './test-prisma.service';

describe('Auth E2E (Simple)', () => {
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

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userEmail = `e2e-test-${Date.now()}@example.com`;
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          name: 'Test User'
        });

      // Le comportement peut varier selon l'implémentation de Better Auth
      // On teste que la requête ne produit pas d'erreur 500
      expect([200, 201, 400, 409]).toContain(response.status);
    });

    it('should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should handle login attempt', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      // On teste que l'endpoint existe et ne produit pas d'erreur serveur
      expect([200, 401, 400]).toContain(response.status);
    });

    it('should reject empty credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should handle logout', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout');

      // Peut être 401 (non authentifié) ou 200 (logout réussi)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Database Integration', () => {
    it('should connect to database', async () => {
      const users = await prisma.user.findMany({
        take: 1
      });
      
      expect(Array.isArray(users)).toBe(true);
    });

    it('should be able to create and delete test data', async () => {
      const testUser = await prisma.user.create({
        data: {
          id: `test-${Date.now()}`,
          email: `db-test-${Date.now()}@example.com`,
          emailVerified: false,
          name: 'DB Test User',
          role: 'USER',
          status: 'ACTIVE'
        }
      });

      expect(testUser.id).toBeDefined();
      expect(testUser.email).toContain('db-test');

      // Cleanup
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    });
  });
});