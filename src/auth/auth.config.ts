import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

export const createBetterAuthConfig = (
  configService: ConfigService,
  prisma: PrismaClient,
) => {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      autoSignIn: false, // L'utilisateur doit vérifier son email d'abord
      sendResetPassword: async ({ user, url, token }, request) => {
        try {
          const { sendEmail } = await import('../utils/replitmail');
          await sendEmail({
            to: user.email,
            subject: 'Réinitialisation de votre mot de passe - Tajdeed',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Réinitialisation de mot de passe</h1>
                <p>Bonjour,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe sur Tajdeed.</p>
                <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
                <a href="${url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Réinitialiser mon mot de passe</a>
                <p>Ce lien expirera dans 1 heure pour votre sécurité.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Équipe Tajdeed</p>
              </div>
            `,
            text: `Réinitialisation de votre mot de passe - Tajdeed\n\nBonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe sur Tajdeed.\n\nCliquez sur ce lien pour créer un nouveau mot de passe :\n${url}\n\nCe lien expirera dans 1 heure pour votre sécurité.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez ce message.\n\nÉquipe Tajdeed`,
          });
        } catch (error) {
          console.error('Erreur envoi email reset password:', error);
        }
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600, // 1 heure
      sendVerificationEmail: async ({ user, url, token }, request) => {
        try {
          const { sendEmail } = await import('../utils/replitmail');
          await sendEmail({
            to: user.email,
            subject: 'Vérifiez votre adresse email - Tajdeed',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Bienvenue sur Tajdeed !</h1>
                <p>Bonjour,</p>
                <p>Merci de vous être inscrit(e) sur Tajdeed, votre nouvelle plateforme de vente entre particuliers.</p>
                <p>Pour finaliser votre inscription et sécuriser votre compte, veuillez vérifier votre adresse email :</p>
                <a href="${url}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Vérifier mon email</a>
                <p>Ce lien expirera dans 1 heure pour votre sécurité.</p>
                <p>Une fois vérifiée, vous pourrez :</p>
                <ul>
                  <li>Publier vos annonces</li>
                  <li>Acheter en toute sécurité</li>
                  <li>Échanger avec la communauté</li>
                </ul>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Équipe Tajdeed</p>
              </div>
            `,
            text: `Bienvenue sur Tajdeed !\n\nBonjour,\n\nMerci de vous être inscrit(e) sur Tajdeed, votre nouvelle plateforme de vente entre particuliers.\n\nPour finaliser votre inscription et sécuriser votre compte, veuillez vérifier votre adresse email :\n${url}\n\nCe lien expirera dans 1 heure pour votre sécurité.\n\nUne fois vérifiée, vous pourrez :\n- Publier vos annonces\n- Acheter en toute sécurité\n- Échanger avec la communauté\n\nÉquipe Tajdeed`,
          });
        } catch (error) {
          console.error('Erreur envoi email verification:', error);
        }
      },
    },
    socialProviders: {
      google: {
        clientId: configService.get<string>('GOOGLE_CLIENT_ID') || '',
        clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
        redirectURI: `${configService.get<string>('APP_URL', 'http://localhost:3000')}/auth/google/callback`,
      },
    },
    session: {
      expiresIn: 60 * 15, // 15 minutes pour l'access token
      updateAge: 60 * 60 * 24, // 24 heures pour la session
    },
    advanced: {
      generateId: () => crypto.randomUUID(),
    },
    
    logger: {
      level: configService.get<string>('NODE_ENV') === 'development' ? 'debug' : 'error',
    },
  });
};

export type AuthInstance = ReturnType<typeof createBetterAuthConfig>;