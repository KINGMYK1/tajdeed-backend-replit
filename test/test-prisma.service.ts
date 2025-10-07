import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TestPrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: [], // Désactiver les logs Prisma pendant les tests
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error('Erreur de connexion à la base de données de test:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanupDatabase() {
    // Nettoyage des tables dans l'ordre pour respecter les contraintes de clés étrangères
    try {
      // Nettoyer seulement les données de test (celles avec des identifiants spécifiques aux tests)
      await this.moderatedUser.deleteMany({
        where: {
          OR: [
            { reason: { contains: 'E2E Test' } },
            { reason: { contains: 'test' } }
          ]
        }
      });
      
      await this.userWarning.deleteMany({
        where: {
          OR: [
            { reason: { contains: 'E2E Test' } },
            { reason: { contains: 'test' } }
          ]
        }
      });
      
      await this.verificationToken.deleteMany({
        where: {
          OR: [
            { identifier: { contains: 'e2e-test' } },
            { identifier: { contains: '@example.com' } }
          ]
        }
      });
      
      await this.session.deleteMany({
        where: {
          user: {
            email: { contains: 'e2e-test' }
          }
        }
      });
      
      await this.account.deleteMany({
        where: {
          user: {
            email: { contains: 'e2e-test' }
          }
        }
      });
      
      await this.user.deleteMany({
        where: {
          email: { contains: 'e2e-test' }
        }
      });
    } catch (error) {
      console.error('Erreur lors du nettoyage de la base de données:', error);
    }
  }
}