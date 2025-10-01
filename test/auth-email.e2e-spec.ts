/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Tests E2E pour l'authentification email/password
 * 
 * Ces tests couvrent tous les endpoints d'authentification :
 * - Inscription
 * - Vérification email
 * - Connexion
 * - Rafraîchissement token
 * - Déconnexion
 * - Réinitialisation mot de passe
 */
describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Données de test
  const testUser = {
    email: 'test@example.com',
    password: 'Test123456!',
    name: 'Test User',
    username: 'testuser',
  };

  let verificationToken: string;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let resetToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configurer les pipes de validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    // Nettoyer la base de données avant les tests
    await prisma.verificationToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.userWarning.deleteMany({});
    await prisma.moderatedUser.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Nettoyer après les tests
    await prisma.verificationToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.userWarning.deleteMany({});
    await prisma.moderatedUser.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    
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
      expect(response.body.message).toContain('Inscription réussie');
      
      userId = response.body.userId;

      // Vérifier que l'utilisateur a été créé dans la DB
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user!.email).toBe(testUser.email);
      expect(user!.emailVerified).toBe(false);
      expect(user!.status).toBe('PENDING_VERIFICATION');

      // Récupérer le token de vérification pour les tests suivants
      const verificationTokenRecord = await prisma.verificationToken.findFirst({
        where: { 
          identifier: testUser.email,
          type: 'EMAIL_VERIFICATION'
        },
      });

      expect(verificationTokenRecord).toBeDefined();
      expect(verificationTokenRecord).not.toBeNull();
      verificationToken = verificationTokenRecord!.token;
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123', // Mot de passe trop faible
          name: 'Test User 2',
          username: 'testuser2',
        })
        .expect(400);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123456!',
          name: 'Test User 3',
          username: 'testuser3',
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test4@example.com',
          // password manquant
        })
        .expect(400);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('vérifié');

      // Vérifier que l'email est marqué comme vérifié
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeDefined();
      expect(user).not.toBeNull();
      expect(user!.emailVerified).toBe(true);
      expect(user!.status).toBe('ACTIVE');
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);
    });

    it('should fail with already used token', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(400);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      // D'abord, créer un nouvel utilisateur non vérifié
      const newUser = {
        email: 'resend@example.com',
        password: 'Test123456!',
        name: 'Resend Test',
        username: 'resendtest',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      // Renvoyer le mail de vérification
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: newUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('renvoyé');

      // Vérifier qu'un nouveau token a été créé
      const newToken = await prisma.verificationToken.findFirst({
        where: { 
          identifier: newUser.email,
          type: 'EMAIL_VERIFICATION'
        },
        orderBy: { expires: 'desc' },
      });

      expect(newToken).toBeDefined();

      // Nettoyer
      await prisma.user.delete({ where: { email: newUser.email } });
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('emailVerified', true);
      expect(response.body).toHaveProperty('status', 'ACTIVE');

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('role', 'USER');

      // Sauvegarder les tokens pour les tests suivants
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123456!',
        })
        .expect(401);
    });

    it('should fail with unverified email', async () => {
      // Créer un utilisateur non vérifié
      const unverifiedUser = {
        email: 'unverified@example.com',
        password: 'Test123456!',
        name: 'Unverified User',
        username: 'unverifieduser',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(unverifiedUser)
        .expect(201);

      // Tenter de se connecter
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password,
        })
        .expect(403);

      // Nettoyer
      await prisma.user.delete({ where: { email: unverifiedUser.email } });
    });
  });

  describe('GET /auth/me', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('role', 'USER');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should fail without token', async () => {
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

      // Mettre à jour les tokens
      const oldRefreshToken = refreshToken;
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;

      // Vérifier que l'ancien refresh token ne fonctionne plus
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Récupérer le token de réinitialisation
      const resetTokenRecord = await prisma.verificationToken.findFirst({
        where: { 
          identifier: testUser.email,
          type: 'PASSWORD_RESET'
        },
        orderBy: { expires: 'desc' },
      });

      expect(resetTokenRecord).toBeDefined();
      expect(resetTokenRecord).not.toBeNull();
      resetToken = resetTokenRecord!.token;
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('réinitialisé');

      // Vérifier que la connexion fonctionne avec le nouveau mot de passe
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      // Mettre à jour pour les tests suivants
      testUser.password = newPassword;
      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword456!',
        })
        .expect(400);
    });

    it('should fail with weak new password', async () => {
      // Demander un nouveau token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      const newResetToken = await prisma.verificationToken.findFirst({
        where: { 
          identifier: testUser.email,
          type: 'PASSWORD_RESET'
        },
        orderBy: { expires: 'desc' },
      });

      expect(newResetToken).toBeDefined();
      expect(newResetToken).not.toBeNull();

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: newResetToken!.token,
          newPassword: '123', // Mot de passe faible
        })
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Vérifier que le token ne fonctionne plus
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should fail without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Complete User Journey', () => {
    it('should complete full registration to login flow', async () => {
      const journeyUser = {
        email: 'journey@example.com',
        password: 'Journey123!',
        name: 'Journey User',
        username: 'journeyuser',
      };

      // 1. Inscription
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(journeyUser)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('userId');

      // 2. Récupérer le token de vérification
      const journeyVerificationToken = await prisma.verificationToken.findFirst({
        where: { 
          identifier: journeyUser.email,
          type: 'EMAIL_VERIFICATION'
        },
      });

      expect(journeyVerificationToken).toBeDefined();
      expect(journeyVerificationToken).not.toBeNull();

      // 3. Vérifier l'email
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: journeyVerificationToken!.token })
        .expect(200);

      // 4. Se connecter
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: journeyUser.email,
          password: journeyUser.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('accessToken');

      const journeyAccessToken = loginResponse.body.accessToken;

      // 5. Récupérer le profil
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${journeyAccessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('username', journeyUser.username);

      // 6. Se déconnecter
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${journeyAccessToken}`)
        .expect(204);

      // Nettoyer
      await prisma.user.delete({ where: { email: journeyUser.email } });
    });
  });
});
function beforeAll(arg0: () => Promise<void>) {
    throw new Error('Function not implemented.');
}

