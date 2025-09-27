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
      enabled: false, // Désactivé pour se concentrer sur OAuth Google
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