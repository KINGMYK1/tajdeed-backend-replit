import { config } from 'dotenv';
import { join } from 'path';

// Charger les variables d'environnement de test
config({ path: join(__dirname, '..', '.env.test') });

// Configuration globale pour les tests E2E
global.console = {
  ...console,
  // Garder les logs d'erreur mais supprimer les debug
  debug: jest.fn(),
  log: jest.fn(),
};