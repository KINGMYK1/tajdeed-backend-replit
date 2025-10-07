import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationType } from '@prisma/client';
import { sendVerificationCodeEmail, sendPasswordResetCodeEmail } from '../utils/verificationCodeEmail';

@Injectable()
export class VerificationCodeService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Génère un code à 6 chiffres aléatoire
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Crée un nouveau code de vérification
   * @param email Email de l'utilisateur
   * @param type Type de vérification (EMAIL ou PASSWORD_RESET)
   * @param expirationMinutes Durée de validité en minutes (par défaut 15 minutes)
   * @returns Le code généré
   */
  async createVerificationCode(
    email: string,
    type: VerificationType,
    expirationMinutes: number = 15,
  ): Promise<string> {
    // Invalider tous les anciens codes non utilisés pour cet email et ce type
    await this.prismaService.verificationCode.updateMany({
      where: {
        email,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Marquer comme utilisé pour les invalider
      },
    });

    // Générer un nouveau code
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    // Créer le code dans la base de données
    await this.prismaService.verificationCode.create({
      data: {
        email,
        code,
        type,
        expiresAt,
      },
    });

    return code;
  }

  /**
   * Vérifie un code de vérification
   * @param email Email de l'utilisateur
   * @param code Code à 6 chiffres
   * @param type Type de vérification
   * @returns true si le code est valide, false sinon
   */
  async verifyCode(
    email: string,
    code: string,
    type: VerificationType,
  ): Promise<boolean> {
    // Rechercher le code
    const verificationCode = await this.prismaService.verificationCode.findFirst({
      where: {
        email,
        code,
        type,
        usedAt: null, // Non utilisé
        expiresAt: {
          gt: new Date(), // Non expiré
        },
      },
    });

    if (!verificationCode) {
      return false;
    }

    // Marquer le code comme utilisé
    await this.prismaService.verificationCode.update({
      where: {
        id: verificationCode.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Nettoie les codes expirés (à exécuter périodiquement)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.prismaService.verificationCode.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            usedAt: {
              not: null,
            },
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Plus de 24h
            },
          },
        ],
      },
    });

    return result.count;
  }

  /**
   * Génère et envoie un code de vérification par email
   * @param userId ID de l'utilisateur
   * @param email Email de l'utilisateur
   * @param type Type de code (EMAIL ou PASSWORD_RESET)
   */
  async generateAndSendCode(
    userId: string,
    email: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ): Promise<void> {
    // Mapper les types vers le format Prisma
    const prismaType: VerificationType = type === 'EMAIL_VERIFICATION' ? 'EMAIL' : 'PASSWORD_RESET';

    // Générer le code
    const code = await this.createVerificationCode(email, prismaType, 15);

    // Envoyer l'email approprié
    if (type === 'EMAIL_VERIFICATION') {
      await sendVerificationCodeEmail(email, code);
    } else {
      await sendPasswordResetCodeEmail(email, code);
    }

    console.log(`✅ Code ${type} généré et envoyé à ${email}`);
  }

  /**
   * Supprimer les codes utilisés pour un email et un type donnés
   */
  async deleteUsedCodes(email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<void> {
    const prismaType: VerificationType = type === 'EMAIL_VERIFICATION' ? 'EMAIL' : 'PASSWORD_RESET';

    await this.prismaService.verificationCode.deleteMany({
      where: {
        email,
        type: prismaType,
        usedAt: { not: null },
      },
    });
  }
}
