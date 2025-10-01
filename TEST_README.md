# 🧪 Guide de Test - Tajdeed Backend

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Tests Automatiques](#tests-automatiques)
3. [Tests Manuels](#tests-manuels)
4. [Configuration](#configuration)
5. [Résolution de Problèmes](#résolution-de-problèmes)

---

## 🎯 Introduction

Ce document contient toutes les informations nécessaires pour tester le backend Tajdeed. Il couvre :

- ✅ Tests automatiques (E2E)
- 📝 Tests manuels avec Postman/Insomnia
- 🔐 Tests d'authentification (email/password et Google)
- 👥 Tests de modération
- 🛡️ Tests de sécurité et permissions

---

## 🤖 Tests Automatiques

### Prérequis

```bash
# Installer les dépendances
yarn install

# Configurer la base de données de test
cp .env .env.test
# Modifier DATABASE_URL dans .env.test pour pointer vers une DB de test
```

### Variables d'environnement pour les tests

Créez un fichier `.env.test` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tajdeed_test"
JWT_SECRET="test-jwt-secret-key-change-in-production"
JWT_REFRESH_SECRET="test-refresh-secret-key-change-in-production"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APP_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@tajdeed.com"
SMTP_PASS="your-smtp-password"
```

### Exécuter tous les tests

```bash
# Tous les tests E2E
yarn test:e2e

# Tests avec coverage
yarn test:e2e --coverage

# Tests en mode watch
yarn test:e2e --watch

# Tests avec logs détaillés
yarn test:e2e --verbose
```

### Exécuter des tests spécifiques

```bash
# Tests d'authentification uniquement
yarn test:e2e auth-email.e2e-spec.ts

# Tests de modération uniquement
yarn test:e2e moderation.e2e-spec.ts

# Test avec pattern
yarn test:e2e --testNamePattern="should register"
```

### Structure des tests

```
test/
├── auth-email.e2e-spec.ts        # Tests authentification email/password
├── moderation.e2e-spec.ts        # Tests système de modération
└── jest-e2e.json                 # Configuration Jest E2E
```

### Tests disponibles

#### Tests Authentification (`auth-email.e2e-spec.ts`)

✅ **Inscription (POST /auth/register)**
- Inscription réussie avec données valides
- Échec avec email en double
- Échec avec mot de passe faible
- Échec avec email invalide
- Échec avec champs manquants

✅ **Vérification email (POST /auth/verify-email)**
- Vérification réussie avec token valide
- Échec avec token invalide
- Échec avec token déjà utilisé

✅ **Renvoyer vérification (POST /auth/resend-verification)**
- Renvoi réussi
- Pas de révélation si email n'existe pas

✅ **Connexion (POST /auth/login)**
- Connexion réussie
- Échec avec mauvais mot de passe
- Échec avec email inexistant
- Échec avec email non vérifié

✅ **Profil (GET /auth/me)**
- Récupération avec token valide
- Échec sans token
- Échec avec token invalide

✅ **Rafraîchir token (POST /auth/refresh)**
- Rafraîchissement réussi
- Échec avec token invalide

✅ **Réinitialisation mot de passe**
- Demande réussie (POST /auth/forgot-password)
- Réinitialisation réussie (POST /auth/reset-password)
- Échec avec token invalide
- Échec avec mot de passe faible

✅ **Déconnexion (POST /auth/logout)**
- Déconnexion réussie
- Échec sans token

✅ **Parcours complet utilisateur**
- Inscription → Vérification → Connexion → Profil → Déconnexion

#### Tests Modération (`moderation.e2e-spec.ts`)

✅ **Actions de modération (POST /moderation/action)**
- Avertissement réussi (admin)
- Suspension temporaire réussie (admin)
- Bannissement permanent réussi (admin)
- Échec utilisateur régulier
- Échec sans authentification
- Échec avec champs manquants
- Échec avec action invalide
- Échec suspension sans durée

✅ **Avertissements (POST /moderation/warning)**
- Ajout réussi (admin)
- Ajout avec différents niveaux de gravité
- Échec avec gravité invalide
- Échec utilisateur régulier

✅ **Historique (GET /moderation/user/:userId/history)**
- Récupération réussie (admin)
- Échec utilisateur régulier
- Échec sans authentification
- Historique vide pour utilisateur sans actions

✅ **Liste utilisateurs (GET /moderation/users)**
- Liste réussie (admin)
- Filtrage par statut
- Pagination
- Échec utilisateur régulier

✅ **Révocation (PUT /moderation/action/:actionId/revoke)**
- Révocation réussie (admin)
- Échec avec ID inexistant
- Échec utilisateur régulier
- Échec sans raison

✅ **Statistiques (GET /moderation/stats)**
- Récupération réussie (admin)
- Échec utilisateur régulier

✅ **Avertissements utilisateur (GET /moderation/user/:userId/warnings)**
- Récupération réussie
- Liste vide pour utilisateur sans avertissements
- Échec vue avertissements d'un autre

✅ **Marquer comme lu (PUT /moderation/warnings/read)**
- Marquage réussi
- Fonctionne sans avertissements non lus
- Échec sans authentification

✅ **Permissions modérateur**
- Peut ajouter avertissements
- Peut appliquer suspensions temporaires
- Peut voir historique
- Peut voir statistiques

✅ **Scénario complet de modération**
- Avertissements multiples → Suspension → Vérification statut → Révocation

### Interpréter les résultats

```bash
# Exemple de sortie réussie
PASS  test/auth-email.e2e-spec.ts (45.2s)
  Auth E2E Tests
    POST /auth/register
      ✓ should register a new user successfully (234ms)
      ✓ should fail with duplicate email (45ms)
    ...

Test Suites: 2 passed, 2 total
Tests:       48 passed, 48 total
Snapshots:   0 total
Time:        90.5s
```

### Déboguer un test qui échoue

```bash
# Activer les logs détaillés
DEBUG=* yarn test:e2e

# Exécuter un seul test
yarn test:e2e --testNamePattern="should register a new user"

# Arrêter au premier échec
yarn test:e2e --bail

# Mode debug Node.js
node --inspect-brk node_modules/.bin/jest --runInBand test/auth-email.e2e-spec.ts
```

---

## 📝 Tests Manuels

### Guide Complet

Consultez le fichier **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** pour le guide détaillé avec :

- 📋 Instructions pas-à-pas pour chaque endpoint
- 💡 Exemples de requêtes complètes
- ✅ Réponses attendues
- 🔴 Erreurs possibles et solutions
- 🎓 Scénarios de test complets
- 📊 Collection Postman

### Démarrage Rapide - Test Manuel

1. **Démarrer le serveur**
```bash
yarn start
```

2. **Importer dans Postman**
   - Ouvrez Postman
   - Cliquez sur "Import"
   - Sélectionnez le fichier `postman-collection.json` (voir TESTING_GUIDE.md)

3. **Tester l'inscription**
```bash
# Avec curl
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User",
    "username": "testuser"
  }'
```

4. **Vérifier l'email**
   - Consulter les logs serveur pour le token de vérification
   - Ou consulter la base de données

5. **Se connecter**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

---

## ⚙️ Configuration

### Base de données

```bash
# Créer la base de données de test
createdb tajdeed_test

# Appliquer le schéma Prisma
yarn prisma:push

# Ou avec les migrations
yarn prisma:migrate
```

### SMTP pour les emails

Pour tester les emails en local, utilisez un serveur SMTP de test :

**Option 1 : Mailtrap (recommandé pour dev)**
```env
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
```

**Option 2 : Ethereal (temporaire)**
```bash
# Générer des identifiants
node -e "require('nodemailer').createTestAccount().then(console.log)"
```

**Option 3 : Gmail (production uniquement)**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
```

### Google OAuth (optionnel)

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet
3. Activer Google+ API
4. Créer des identifiants OAuth 2.0
5. Ajouter les URLs de redirection autorisées :
   ```
   http://localhost:3000/auth/google/callback
   http://localhost:5173/auth/callback
   ```
6. Copier Client ID et Client Secret dans `.env`

---

## 🐛 Résolution de Problèmes

### Tests échouent avec erreur de connexion DB

**Problème** : `Error: Can't reach database server`

**Solution** :
```bash
# Vérifier que PostgreSQL est démarré
sudo service postgresql status

# Vérifier la connexion
psql -U postgres -d tajdeed_test

# Vérifier l'URL dans .env.test
echo $DATABASE_URL
```

### Erreur "Port 3000 already in use"

**Problème** : Le port est déjà utilisé

**Solution** :
```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Ou changer le port
PORT=3001 yarn start
```

### Tests timeout

**Problème** : `Timeout - Async callback was not invoked`

**Solution** :
```bash
# Augmenter le timeout dans jest-e2e.json
{
  "testTimeout": 30000
}

# Ou dans le test spécifique
jest.setTimeout(30000);
```

### Tokens de vérification expirés pendant les tests

**Problème** : Les tokens expirent avant qu'on puisse les utiliser

**Solution** :
```typescript
// Dans auth.config.ts, augmenter la durée pour les tests
emailVerification: {
  sendOnSignUp: true,
  autoSignInAfterVerification: false,
  expiresIn: NODE_ENV === 'test' ? 3600 * 24 : 3600, // 24h en test, 1h en prod
}
```

### Emails ne sont pas envoyés en test

**Problème** : Les emails ne sont pas envoyés pendant les tests

**Solution** :
```bash
# Option 1 : Mocker l'envoi d'emails
# Dans les tests, vérifier que la fonction sendEmail est appelée

# Option 2 : Utiliser un service de test d'email
# Mailtrap, Ethereal, etc.

# Option 3 : Désactiver l'envoi en test
if (process.env.NODE_ENV !== 'test') {
  await sendEmail({...});
}
```

### Erreur "User already exists" pendant les tests

**Problème** : Les données de test ne sont pas nettoyées

**Solution** :
```typescript
// S'assurer que beforeAll et afterAll nettoient bien
beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: testEmails } }
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: testEmails } }
  });
});
```

### Permissions refusées en modération

**Problème** : `403 Forbidden` lors des tests de modération

**Solution** :
```typescript
// Vérifier que le rôle est bien assigné
await prisma.user.update({
  where: { id: userId },
  data: { role: 'ADMIN' }
});

// Attendre un peu après l'assignation
await new Promise(resolve => setTimeout(resolve, 100));

// Ensuite faire la requête
```

### Erreur de validation des DTOs

**Problème** : `400 Bad Request - validation failed`

**Solution** :
```bash
# Vérifier que les ValidationPipes sont configurés
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));

# Vérifier les DTOs
# Tous les champs requis doivent avoir @IsNotEmpty()
# Les emails doivent avoir @IsEmail()
# etc.
```

---

## 📊 Métriques de Test

### Objectifs de couverture

- **Couverture minimale** : 80%
- **Couverture cible** : 90%
- **Couverture critique (auth, moderation)** : 95%

### Vérifier la couverture

```bash
# Générer le rapport de couverture
yarn test:e2e --coverage

# Rapport HTML
open coverage/lcov-report/index.html
```

### Rapport de couverture attendu

```
File                        | % Stmts | % Branch | % Funcs | % Lines
----------------------------|---------|----------|---------|--------
All files                   |   88.5  |   85.2   |   90.1  |   88.9
 auth/
  auth.controller.ts        |   95.2  |   92.3   |   96.7  |   95.5
  auth.service.ts           |   93.8  |   89.1   |   94.2  |   94.1
  auth.guard.ts             |   100   |   100    |   100   |   100
 moderation/
  moderation.controller.ts  |   92.1  |   88.5   |   93.3  |   92.4
  moderation.service.ts     |   90.5  |   86.7   |   91.2  |   90.8
```

---

## 🎯 Checklist de Test Avant Déploiement

### Fonctionnalités

- [ ] Inscription fonctionne
- [ ] Email de vérification envoyé
- [ ] Vérification email fonctionne
- [ ] Connexion fonctionne
- [ ] Rafraîchissement token fonctionne
- [ ] Déconnexion fonctionne
- [ ] Réinitialisation mot de passe fonctionne
- [ ] Récupération profil fonctionne
- [ ] Authentification Google fonctionne

### Modération

- [ ] Admin peut ajouter avertissements
- [ ] Admin peut suspendre temporairement
- [ ] Admin peut bannir définitivement
- [ ] Admin peut révoquer actions
- [ ] Admin peut voir historique
- [ ] Admin peut voir statistiques
- [ ] Modérateur a permissions limitées
- [ ] User ne peut pas modérer
- [ ] Emails de notification envoyés

### Sécurité

- [ ] Tokens JWT sécurisés
- [ ] Mots de passe hashés (bcrypt)
- [ ] Rate limiting actif
- [ ] CORS configuré correctement
- [ ] Helmet headers actifs
- [ ] Validation des entrées stricte
- [ ] Pas de données sensibles en logs
- [ ] Erreurs génériques (pas de révélation d'info)

### Performance

- [ ] Temps de réponse < 200ms (endpoints simples)
- [ ] Temps de réponse < 500ms (endpoints complexes)
- [ ] Pagination fonctionne correctement
- [ ] Pas de requêtes N+1
- [ ] Index DB optimisés

### Tests

- [ ] Tous les tests E2E passent
- [ ] Couverture > 80%
- [ ] Pas de tests skip/todo
- [ ] Tests de sécurité passent
- [ ] Tests de charge OK (si applicable)

---

## 📞 Support et Contributions

### Besoin d'aide ?

1. Consultez d'abord ce README
2. Consultez [TESTING_GUIDE.md](./TESTING_GUIDE.md)
3. Consultez les logs du serveur
4. Consultez [ARCHITECTURE.md](./ARCHITECTURE.md)
5. Contactez l'équipe de développement

### Ajouter de nouveaux tests

```typescript
// 1. Créer un nouveau fichier de test
// test/new-feature.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('New Feature E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test new feature', async () => {
    const response = await request(app.getHttpServer())
      .get('/new-endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### Standards de test

1. **Nommage** : `should [action] [expected result]`
2. **AAA Pattern** : Arrange, Act, Assert
3. **Isolation** : Chaque test doit être indépendant
4. **Nettoyage** : Toujours nettoyer après les tests
5. **Données** : Utiliser des données de test cohérentes
6. **Assertions** : Au moins une assertion par test
7. **Performance** : Tests < 5s chacun

---

## 📚 Ressources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Better Auth Documentation](https://better-auth.com/)

---

**Dernière mise à jour** : Octobre 2025  
**Version** : 1.0.0  
**Mainteneurs** : Équipe Tajdeed
