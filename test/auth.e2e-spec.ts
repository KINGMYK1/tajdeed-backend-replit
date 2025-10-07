import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth E2E - Core Authentication Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Variables de test partagées
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let verificationToken: string;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'Test User E2E',
    username: 'teste2e'
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = module.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    // Configuration des pipes de validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    // Nettoyage complet
    if (userId) {
      await prisma.verificationToken.deleteMany({ where: { identifier: testUser.email } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.account.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toContain('inscrit avec succès');
      
      userId = response.body.userId;

      // Vérifier que l'utilisateur est créé en base
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user).toBeDefined();
      expect(user?.email).toBe(testUser.email);
      expect(user?.emailVerified).toBe(false);
      expect(user?.status).toBe('PENDING_VERIFICATION');

      // Vérifier qu'un token de vérification a été créé
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { identifier: testUser.email }
      });
      expect(tokenRecord).toBeDefined();
      verificationToken = tokenRecord!.token;
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400);
    });

    it('should fail with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'test2@example.com',
          password: '123'
        })
        .expect(400);
    });

    it('should fail with missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test3@example.com'
          // password and name missing
        })
        .expect(400);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email vérifié');

      // Vérifier que l'utilisateur est maintenant vérifié
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.emailVerified).toBe(true);
      expect(user?.status).toBe('ACTIVE');
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);
    });

    it('should fail with expired token', async () => {
      // Créer un token expiré
      const expiredToken = await prisma.verificationToken.create({
        data: {
          identifier: 'expired@example.com',
          token: 'expired-token-123',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expiré depuis 24h
        }
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: expiredToken.token })
        .expect(400);

      // Nettoyer
      await prisma.verificationToken.delete({ where: { id: expiredToken.id } });
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with verified email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');

      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.role).toBe('USER');

      // Sauvegarder les tokens pour les tests suivants
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);
    });

    it('should fail with unverified email', async () => {
      // Créer un utilisateur non vérifié
      const unverifiedUser = {
        email: `unverified-${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Unverified User'
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(unverifiedUser)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password
        })
        .expect(403);

      // Nettoyer
      await prisma.user.delete({ where: { id: registerResponse.body.userId } });
    });
  });

  describe('GET /auth/me', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('role');
      
      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.name).toBe(testUser.name);
      expect(response.body.role).toBe('USER');
    });

    it('should fail without authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should fail with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');

      // Les nouveaux tokens doivent être différents
      expect(response.body.accessToken).not.toBe(accessToken);
      expect(response.body.refreshToken).not.toBe(refreshToken);

      // Mettre à jour les tokens pour les tests suivants
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should fail with expired refresh token', async () => {
      // Créer une session expirée
      const expiredSession = await prisma.session.create({
        data: {
          sessionToken: 'expired-session-token',
          userId,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expiré depuis 24h
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        }
      });

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: `refresh_${userId}_${expiredSession.sessionToken}` })
        .expect(401);

      // Nettoyer
      await prisma.session.delete({ where: { id: expiredSession.id } });
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      // Créer un nouvel utilisateur non vérifié pour le test
      const newUser = {
        email: `resend-test-${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Resend Test User'
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: newUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('renvoyé');

      // Vérifier qu'un token de vérification existe
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { identifier: newUser.email }
      });
      expect(tokenRecord).toBeDefined();

      // Nettoyer
      await prisma.user.delete({ where: { id: registerResponse.body.userId } });
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Vérifier que le token n'est plus valide
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should fail without authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken: string;

    it('should initiate password reset', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('réinitialisation');

      // Récupérer le token de reset
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { identifier: testUser.email },
        orderBy: { expiresAt: 'desc' }
      });
      expect(tokenRecord).toBeDefined();
      resetToken = tokenRecord!.token;
    });

    it('should reset password successfully', async () => {
      const newPassword = 'NewSecurePass123!';
      
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('réinitialisé');

      // Vérifier qu'on peut se connecter avec le nouveau mot de passe
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');
    });

    it('should fail reset with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-reset-token',
          newPassword: 'AnotherPassword123!'
        })
        .expect(400);
    });
  });

  describe('Security Tests', () => {
    it('should rate limit registration attempts', async () => {
      const promises = [];
      
      // Tenter plusieurs inscriptions rapidement
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/auth/register')
            .send({
              email: `rate-limit-${i}@example.com`,
              password: 'Password123!',
              name: 'Rate Limit Test'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Au moins une requête devrait être rate limitée (429)
      const rateLimited = responses.some(response => response.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should validate input data strictly', async () => {
      // Test avec des données malformées
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'valid@example.com',
          password: 'ValidPass123!',
          name: 'Valid Name',
          unexpectedField: 'should be rejected'
        })
        .expect(400);
    });

    it('should handle SQL injection attempts safely', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: "admin@example.com'; DROP TABLE users; --",
          password: "password"
        })
        .expect(401); // Should not crash, just return unauthorized
    });

    it('should handle XSS attempts in registration', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'xss@example.com',
          password: 'Password123!',
          name: '<script>alert("xss")</script>'
        })
        .expect(201); // Should accept but sanitize the input
    });
  });
});
