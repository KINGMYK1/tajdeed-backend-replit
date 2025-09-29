import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authTokens: {
    accessToken: string;
    refreshToken: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    // Nettoyer la base de données de test avant chaque test
    await prismaService.deviceSession.deleteMany();
    await prismaService.appUser.deleteMany();
  });

  afterAll(async () => {
    // Nettoyer après tous les tests
    await prismaService.deviceSession.deleteMany();
    await prismaService.appUser.deleteMany();
    await prismaService.$disconnect();
    await app.close();
  });

  describe('/auth/google (POST)', () => {
    it('devrait créer un nouvel utilisateur et retourner des tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/google')
        .send({ code: 'test-google-code' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('username', 'test@example.com');
          expect(res.body.user).toHaveProperty('role', 'USER');
          expect(res.body).toHaveProperty('expiresIn', 900);

          // Sauvegarder les tokens pour les tests suivants
          authTokens = {
            accessToken: res.body.accessToken,
            refreshToken: res.body.refreshToken,
          };
        });
    });

    it('devrait retourner 400 pour un body invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/google')
        .send({}) // Body vide
        .expect(400);
    });
  });

  describe('/auth/google/callback (GET)', () => {
    it('devrait traiter le callback Google avec succès', () => {
      return request(app.getHttpServer())
        .get('/auth/google/callback?code=test-callback-code&state=test-state')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Authentification réussie');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('devrait retourner 400 si le code est manquant', () => {
      return request(app.getHttpServer())
        .get('/auth/google/callback')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('Code d\\'autorisation manquant');
        });
    });
  });

  describe('/auth/me (GET)', () => {
    beforeEach(async () => {
      // Créer un utilisateur et obtenir des tokens
      const response = await request(app.getHttpServer())
        .post('/auth/google')
        .send({ code: 'test-setup-code' });

      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });

    it('devrait retourner le profil utilisateur avec un token valide', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username', 'test@example.com');
          expect(res.body).toHaveProperty('role', 'USER');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
        });
    });

    it('devrait retourner 401 sans token d\\'autorisation', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Token d\\'accès manquant');
        });
    });

    it('devrait retourner 401 avec un token invalide', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Token invalide');
        });
    });
  });

  describe('/auth/refresh (POST)', () => {
    beforeEach(async () => {
      // Créer un utilisateur et obtenir des tokens
      const response = await request(app.getHttpServer())
        .post('/auth/google')
        .send({ code: 'test-refresh-setup' });

      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });

    it('devrait renouveler les tokens avec un refresh token valide', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('expiresIn', 900);
          
          // Le nouveau token devrait être différent
          expect(res.body.accessToken).not.toBe(authTokens.accessToken);
          expect(res.body.refreshToken).not.toBe(authTokens.refreshToken);
        });
    });

    it('devrait retourner 401 avec un refresh token invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Refresh token invalide');
        });
    });

    it('devrait retourner 400 pour un body invalide', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({}) // Body vide
        .expect(400);
    });
  });

  describe('/auth/logout (POST)', () => {
    beforeEach(async () => {
      // Créer un utilisateur et obtenir des tokens
      const response = await request(app.getHttpServer())
        .post('/auth/google')
        .send({ code: 'test-logout-setup' });

      authTokens = {
        accessToken: response.body.accessToken,
        refreshToken: response.body.refreshToken,
      };
    });

    it('devrait déconnecter l\\'utilisateur avec succès', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(204);
    });

    it('devrait retourner 401 sans token d\\'autorisation', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Token d\\'accès manquant');
        });
    });

    it('l\\'accès devrait être refusé après déconnexion', async () => {
      // Déconnexion
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(204);

      // Tentative d'accès au profil après déconnexion
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .expect(401);
    });
  });

  describe('Flux d\\'authentification complet', () => {
    it('devrait permettre un cycle complet : connexion -> profil -> refresh -> déconnexion', async () => {
      // 1. Connexion
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/google')
        .send({ code: 'test-full-flow' })
        .expect(200);

      const tokens = {
        accessToken: loginResponse.body.accessToken,
        refreshToken: loginResponse.body.refreshToken,
      };

      // 2. Vérification du profil
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      // 3. Renouvellement des tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      const newTokens = {
        accessToken: refreshResponse.body.accessToken,
        refreshToken: refreshResponse.body.refreshToken,
      };

      // 4. Vérification du profil avec nouveaux tokens
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(200);

      // 5. Déconnexion
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(204);

      // 6. Vérification que l'accès est refusé après déconnexion
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${newTokens.accessToken}`)
        .expect(401);
    });
  });
});