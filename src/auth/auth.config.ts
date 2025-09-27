import { ConfigService } from '@nestjs/config';

export interface BetterAuthConfig {
  secret: string;
  database: {
    provider: 'postgresql';
    url: string;
  };
  socialProviders: {
    google: {
      clientId: string;
      clientSecret: string;
    };
  };
}

export const createBetterAuthConfig = (
  configService: ConfigService,
): BetterAuthConfig => {
  return {
    secret: configService.get<string>('BETTER_AUTH_SECRET') || 'default-secret',
    database: {
      provider: 'postgresql',
      url: configService.get<string>('DATABASE_URL') || 'postgresql://localhost:5432/tajdeed',
    },
    socialProviders: {
      google: {
        clientId: configService.get<string>('GOOGLE_CLIENT_ID') || '',
        clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      },
    },
  };
};