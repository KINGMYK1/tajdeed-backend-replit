/**
 * Configuration Jest pour les tests E2E
 * Fichier de setup exécuté avant tous les tests
 */

// Configuration globale pour Jest
jest.setTimeout(30000);

// Mock de console pour éviter les logs de spam durant les tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Réduire les logs pendant les tests sauf si VERBOSE=true
  if (!process.env.VERBOSE) {
    console.log = jest.fn();
    console.warn = jest.fn();
    // Garder console.error pour les vraies erreurs
    console.error = (...args) => {
      // Filtrer certains warnings non critiques
      const message = args.join(' ');
      if (
        message.includes('Better Auth') &&
        message.includes('deprecated')
      ) {
        return; // Ignorer les warnings de dépréciation Better Auth
      }
      originalConsoleError(...args);
    };
  }
});

afterAll(() => {
  // Restaurer les console logs originaux
  if (!process.env.VERBOSE) {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/tajdeed_test';
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-e2e-tests-only-32-chars-min';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Mock des services externes si nécessaire
if (process.env.NODE_ENV === 'test') {
  // Mock des emails pour les tests
  jest.mock('../src/utils/emailService', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
  }));
  
  jest.mock('../src/utils/replitmail', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
  }));
}