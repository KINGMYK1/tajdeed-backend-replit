import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestPrismaService } from './test-prisma.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth E2E - Code à 6 chiffres', () => {
  let app: INestApplication;
  let prisma: TestPrismaService;
  let verificationCode: string;
  let passwordResetCode: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  const testName = 'Test User';
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useClass(TestPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(TestPrismaService);
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('✅ Devrait inscrire un nouvel utilisateur et envoyer un code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toContain('code de vérification');
      
      userId = response.body.userId;

      // Vérifier que le code a été créé en base de données
      const code = await prisma.verificationCode.findFirst({
        where: {
          email: testEmail,
          type: 'EMAIL_VERIFICATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(code).toBeDefined();
      expect(code?.code).toMatch(/^\d{6}$/);
      verificationCode = code!.code;
    });

    it('❌ Devrait refuser une inscription avec email déjà existant', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: testName,
        })
        .expect(409);
    });

    it('❌ Devrait valider le format de l\'email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: testPassword,
          name: testName,
        })
        .expect(400);
    });

    it('❌ Devrait valider la longueur du mot de passe', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123',
          name: testName,
        })
        .expect(400);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('✅ Devrait vérifier l\'email avec un code valide', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: testEmail,
          code: verificationCode,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;

      // Vérifier que l'utilisateur est maintenant vérifié
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user?.emailVerified).toBe(true);
      expect(user?.status).toBe('ACTIVE');
    });

    it('❌ Devrait refuser un code invalide', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: testEmail,
          code: '999999',
        })
        .expect(400);
    });

    it('❌ Devrait valider le format du code (6 chiffres)', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: testEmail,
          code: '12345', // Seulement 5 chiffres
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: testEmail,
          code: 'ABCDEF', // Pas des chiffres
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('✅ Devrait connecter un utilisateur vérifié', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
    });

    it('❌ Devrait refuser un mot de passe incorrect', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('❌ Devrait refuser un email non vérifié', async () => {
      const unverifiedEmail = `unverified-${Date.now()}@example.com`;
      
      // Créer un utilisateur non vérifié
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: unverifiedEmail,
          password: testPassword,
          name: 'Unverified User',
        })
        .expect(201);

      // Tenter de se connecter
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: unverifiedEmail,
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('✅ Devrait renvoyer un nouveau code de vérification', async () => {
      const newEmail = `resend-${Date.now()}@example.com`;
      
      // Créer un utilisateur
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: newEmail,
          password: testPassword,
          name: 'Resend User',
        })
        .expect(201);

      // Renvoyer le code
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({
          email: newEmail,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('code');

      // Vérifier qu'un nouveau code a été créé
      const codes = await prisma.verificationCode.findMany({
        where: {
          email: newEmail,
          type: 'EMAIL_VERIFICATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(codes.length).toBeGreaterThan(0);
    });

    it('❌ Devrait refuser de renvoyer un code pour un email déjà vérifié', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({
          email: testEmail, // Email déjà vérifié
        })
        .expect(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('✅ Devrait envoyer un code de réinitialisation', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testEmail,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Récupérer le code de la base de données
      const code = await prisma.verificationCode.findFirst({
        where: {
          email: testEmail,
          type: 'PASSWORD_RESET',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(code).toBeDefined();
      expect(code?.code).toMatch(/^\d{6}$/);
      passwordResetCode = code!.code;
    });

    it('✅ Ne devrait pas révéler si l\'email existe ou non', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('✅ Devrait réinitialiser le mot de passe avec un code valide', async () => {
      const newPassword = 'NewPassword123!@#';

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testEmail,
          code: passwordResetCode,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Vérifier qu'on peut se connecter avec le nouveau mot de passe
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);
    });

    it('❌ Devrait refuser un code invalide', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testEmail,
          code: '999999',
          newPassword: 'NewPassword456!@#',
        })
        .expect(400);
    });

    it('❌ Devrait valider le nouveau mot de passe', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          email: testEmail,
          code: passwordResetCode,
          newPassword: '123', // Trop court
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('✅ Devrait rafraîchir le token d\'accès', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('❌ Devrait refuser un refresh token invalide', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('✅ Devrait récupérer le profil de l\'utilisateur connecté', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(testEmail);
    });

    it('❌ Devrait refuser sans token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('❌ Devrait refuser avec un token invalide', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('✅ Devrait déconnecter l\'utilisateur', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Vérifier que la session a été supprimée
      const session = await prisma.session.findFirst({
        where: { userId: userId },
      });

      expect(session).toBeNull();
    });
  });

  describe('Expiration des codes', () => {
    it('✅ Un code expiré devrait être rejeté', async () => {
      const expiredEmail = `expired-${Date.now()}@example.com`;

      // Créer un utilisateur
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: expiredEmail,
          password: testPassword,
          name: 'Expired User',
        })
        .expect(201);

      // Récupérer le code
      const code = await prisma.verificationCode.findFirst({
        where: {
          email: expiredEmail,
          type: 'EMAIL_VERIFICATION',
        },
      });

      // Faire expirer le code manuellement
      await prisma.verificationCode.update({
        where: { id: code!.id },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expiré il y a 1 seconde
      });

      // Tenter de vérifier avec le code expiré
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          email: expiredEmail,
          code: code!.code,
        })
        .expect(400);
    });
  });
});
