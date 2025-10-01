# 🧪 Guide de Test - Tajdeed Backend

## Vue d'ensemble

Ce document fournit un guide complet pour tester toutes les fonctionnalités implémentées du backend Tajdeed, incluant l'authentification (Google OAuth, Email/Password avec vérification email) et le système de modération.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Tests Automatiques](#tests-automatiques)
4. [Tests Manuels avec Postman/Insomnia](#tests-manuels-avec-postmaninsomnia)
5. [Scénarios de Test](#scénarios-de-test)
6. [Dépannage](#dépannage)

---

## Prérequis

### Logiciels requis

- **Node.js** : v18 ou supérieur
- **Yarn** : v1.22 ou supérieur
- **PostgreSQL** : v14 ou supérieur
- **Postman** ou **Insomnia** : Pour les tests manuels

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/tajdeed_db"

# Configuration de l'application
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development

# Configuration Better Auth
BETTER_AUTH_SECRET="votre-secret-key-ici" # Générez avec: openssl rand -hex 32
BETTER_AUTH_URL=http://localhost:3000

# Configuration Google OAuth
GOOGLE_CLIENT_ID="votre-google-client-id"
GOOGLE_CLIENT_SECRET="votre-google-client-secret"

# Configuration Email (ReplitMail)
REPLIT_MAIL_API_KEY="votre-replit-mail-api-key"

# JWT
JWT_SECRET="votre-jwt-secret" # Générez avec: openssl rand -hex 32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Installation

```bash
# 1. Installer les dépendances
yarn install

# 2. Générer le client Prisma
yarn prisma:generate

# 3. Créer la base de données et appliquer les migrations
yarn prisma:migrate

# 4. (Optionnel) Voir la base de données avec Prisma Studio
yarn prisma:studio
```

---

## Tests Automatiques

### Lancer tous les tests

```bash
# Tests E2E complets
yarn test:e2e

# Tests avec couverture
yarn test:cov

# Mode watch (développement)
yarn test:watch
```

### Lancer des tests spécifiques

```bash
# Tests d'authentification Google
yarn test:e2e auth.e2e-spec

# Tests d'authentification Email/Password
yarn test:e2e auth-email.e2e-spec

# Tests de modération
yarn test:e2e moderation.e2e-spec
```

### Structure des tests

```
test/
├── auth.e2e-spec.ts           # Tests OAuth Google
├── auth-email.e2e-spec.ts     # Tests Email/Password
├── moderation.e2e-spec.ts     # Tests système de modération
└── jest-e2e.json              # Configuration Jest
```

---

## Tests Manuels avec Postman/Insomnia

### 📥 Importer la collection

Créez une collection avec les endpoints suivants :

### Variables d'environnement de la collection

```
baseUrl: http://localhost:3000
accessToken: (sera rempli après connexion)
refreshToken: (sera rempli après connexion)
userId: (sera rempli après inscription)
moderatorToken: (sera rempli après connexion modérateur)
```

---

## 🔐 Endpoints d'Authentification Email/Password

### 1. Inscription (Register)

**Endpoint:** `POST {{baseUrl}}/auth/register/email`

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "Password123!",
  "username": "testuser",
  "name": "Test User"
}
```

**Réponse attendue (201):**
```json
{
  "success": true,
  "message": "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "name": "Test User",
    "emailVerified": false
  }
}
```

**Tests à effectuer:**
- ✅ Inscription avec données valides
- ❌ Inscription avec email déjà utilisé
- ❌ Inscription avec mot de passe faible
- ❌ Inscription avec email invalide

---

### 2. Vérification d'email

**Endpoint:** `POST {{baseUrl}}/auth/verify-email`

**Body (JSON):**
```json
{
  "token": "token-reçu-par-email"
}
```

**Comment obtenir le token pour les tests :**

Pendant les tests, le token de vérification est affiché dans les logs du serveur. Cherchez :
```
Email de vérification envoyé à test@example.com
Token de vérification: abc123def456...
```

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Email vérifié avec succès",
  "autoSignIn": true,
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "emailVerified": true
  }
}
```

---

### 3. Connexion (Login)

**Endpoint:** `POST {{baseUrl}}/auth/login/email`

**Body (JSON):**
```json
{
  "email": "test@example.com",
  "password": "Password123!"
}
```

**Réponse attendue (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_ici",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "name": "Test User",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

**⚠️ Important:** Copiez l'`accessToken` et le `refreshToken` pour les requêtes suivantes !

**Tests à effectuer:**
- ✅ Connexion avec identifiants valides
- ❌ Connexion avec email non vérifié
- ❌ Connexion avec mot de passe incorrect
- ❌ Connexion avec email inexistant
- ❌ Connexion avec compte suspendu/banni

---

### 4. Renvoyer l'email de vérification

**Endpoint:** `POST {{baseUrl}}/auth/resend-verification`

**Body (JSON):**
```json
{
  "email": "test@example.com"
}
```

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Email de vérification renvoyé avec succès"
}
```

---

### 5. Demande de réinitialisation de mot de passe

**Endpoint:** `POST {{baseUrl}}/auth/forgot-password`

**Body (JSON):**
```json
{
  "email": "test@example.com"
}
```

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Email de réinitialisation envoyé"
}
```

---

### 6. Réinitialisation de mot de passe

**Endpoint:** `POST {{baseUrl}}/auth/reset-password`

**Body (JSON):**
```json
{
  "token": "token-reçu-par-email",
  "newPassword": "NewPassword123!"
}
```

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

---

### 7. Rafraîchir le token

**Endpoint:** `POST {{baseUrl}}/auth/refresh`

**Body (JSON):**
```json
{
  "refreshToken": "votre-refresh-token"
}
```

**Réponse attendue (200):**
```json
{
  "accessToken": "nouveau-access-token",
  "refreshToken": "nouveau-refresh-token"
}
```

---

### 8. Déconnexion (Logout)

**Endpoint:** `POST {{baseUrl}}/auth/logout`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

### 9. Obtenir le profil utilisateur

**Endpoint:** `GET {{baseUrl}}/auth/profile`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Réponse attendue (200):**
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "name": "Test User",
  "username": "testuser",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerified": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 🛡️ Endpoints de Modération

### Configuration préalable

Pour tester les endpoints de modération, vous devez avoir un compte avec le rôle `ADMIN`. Créez-le via Prisma Studio ou SQL :

```sql
UPDATE "users" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

### 1. Appliquer une action de modération

**Endpoint:** `POST {{baseUrl}}/moderation/actions`

**Headers:**
```
Authorization: Bearer {{moderatorToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "userId": "uuid-de-l-utilisateur-cible",
  "action": "WARNING",
  "reason": "Contenu inapproprié publié",
  "duration": null,
  "evidence": "https://example.com/screenshot.png"
}
```

**Actions disponibles:**
- `WARNING` : Avertissement simple
- `TEMPORARY_SUSPENSION` : Suspension temporaire (spécifier `duration` en heures)
- `PERMANENT_BAN` : Bannissement permanent
- `CONTENT_REMOVAL` : Suppression de contenu
- `ACCOUNT_RESTRICTION` : Restriction de compte

**Exemple avec suspension temporaire:**
```json
{
  "userId": "uuid",
  "action": "TEMPORARY_SUSPENSION",
  "reason": "Spam répété",
  "duration": 72,
  "evidence": null
}
```

**Réponse attendue (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "moderatorId": "uuid",
  "action": "WARNING",
  "reason": "Contenu inapproprié publié",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

### 2. Envoyer un avertissement à un utilisateur

**Endpoint:** `POST {{baseUrl}}/moderation/warnings`

**Headers:**
```
Authorization: Bearer {{moderatorToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "userId": "uuid-de-l-utilisateur",
  "reason": "Langage inapproprié dans les commentaires",
  "severity": "MEDIUM"
}
```

**Niveaux de sévérité:**
- `LOW` : Avertissement léger
- `MEDIUM` : Avertissement moyen
- `HIGH` : Avertissement sévère
- `CRITICAL` : Avertissement critique

**Réponse attendue (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "reason": "Langage inapproprié dans les commentaires",
  "severity": "MEDIUM",
  "isRead": false,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

### 3. Obtenir l'historique de modération d'un utilisateur

**Endpoint:** `GET {{baseUrl}}/moderation/history/:userId`

**Headers:**
```
Authorization: Bearer {{moderatorToken}}
```

**Exemple:** `GET {{baseUrl}}/moderation/history/123e4567-e89b-12d3-a456-426614174000`

**Réponse attendue (200):**
```json
{
  "userId": "uuid",
  "currentStatus": "ACTIVE",
  "moderationActions": [
    {
      "id": "uuid",
      "action": "WARNING",
      "reason": "Contenu inapproprié",
      "moderator": {
        "id": "uuid",
        "name": "Admin User"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "warnings": [
    {
      "id": "uuid",
      "reason": "Langage inapproprié",
      "severity": "MEDIUM",
      "isRead": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 4. Lister les utilisateurs modérés

**Endpoint:** `GET {{baseUrl}}/moderation/moderated-users`

**Headers:**
```
Authorization: Bearer {{moderatorToken}}
```

**Query Parameters (optionnels):**
```
action: WARNING|TEMPORARY_SUSPENSION|PERMANENT_BAN
status: ACTIVE|SUSPENDED|BANNED
moderatorId: uuid
page: 1
limit: 20
```

**Exemple:** `GET {{baseUrl}}/moderation/moderated-users?action=WARNING&limit=10`

**Réponse attendue (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "moderatorId": "uuid",
      "action": "WARNING",
      "reason": "Contenu inapproprié",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "User Name",
        "status": "ACTIVE"
      },
      "moderator": {
        "id": "uuid",
        "name": "Admin Name"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 5. Révoquer une action de modération

**Endpoint:** `POST {{baseUrl}}/moderation/revoke/:actionId`

**Headers:**
```
Authorization: Bearer {{moderatorToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "reason": "Erreur dans l'évaluation initiale"
}
```

**Exemple:** `POST {{baseUrl}}/moderation/revoke/123e4567-e89b-12d3-a456-426614174000`

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Action de modération révoquée avec succès"
}
```

---

### 6. Obtenir les statistiques de modération

**Endpoint:** `GET {{baseUrl}}/moderation/stats`

**Headers:**
```
Authorization: Bearer {{moderatorToken}}
```

**Réponse attendue (200):**
```json
{
  "totalActions": 150,
  "activeWarnings": 12,
  "bannedUsers": 5,
  "suspendedUsers": 3,
  "actionsThisMonth": 42,
  "topReasons": [
    {
      "reason": "Contenu inapproprié",
      "count": 25
    },
    {
      "reason": "Spam",
      "count": 18
    }
  ]
}
```

---

### 7. Obtenir les avertissements d'un utilisateur

**Endpoint:** `GET {{baseUrl}}/moderation/warnings/:userId`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Exemple:** `GET {{baseUrl}}/moderation/warnings/me` (pour l'utilisateur connecté)

**Réponse attendue (200):**
```json
{
  "warnings": [
    {
      "id": "uuid",
      "reason": "Langage inapproprié",
      "severity": "MEDIUM",
      "isRead": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

---

### 8. Marquer les avertissements comme lus

**Endpoint:** `PATCH {{baseUrl}}/moderation/warnings/:userId/read`

**Headers:**
```
Authorization: Bearer {{accessToken}}
```

**Exemple:** `PATCH {{baseUrl}}/moderation/warnings/me/read`

**Réponse attendue (200):**
```json
{
  "success": true,
  "message": "Avertissements marqués comme lus"
}
```

---

## 📝 Scénarios de Test Complets

### Scénario 1 : Parcours utilisateur complet

1. **Inscription**
   ```
   POST /auth/register/email
   → Vérifier que l'email de vérification est envoyé
   ```

2. **Vérification email**
   ```
   POST /auth/verify-email
   → Récupérer le token des logs
   → Vérifier que le compte est activé
   ```

3. **Connexion**
   ```
   POST /auth/login/email
   → Sauvegarder accessToken et refreshToken
   ```

4. **Obtenir le profil**
   ```
   GET /auth/profile
   → Vérifier que emailVerified = true
   ```

5. **Rafraîchir le token**
   ```
   POST /auth/refresh
   → Vérifier nouveaux tokens générés
   ```

6. **Déconnexion**
   ```
   POST /auth/logout
   → Vérifier que le token est invalidé
   ```

---

### Scénario 2 : Parcours de modération

1. **Créer un utilisateur normal et un admin**
   ```sql
   -- Via Prisma Studio ou SQL
   UPDATE "users" SET role = 'ADMIN' WHERE email = 'admin@example.com';
   ```

2. **Connexion admin**
   ```
   POST /auth/login/email
   → Sauvegarder moderatorToken
   ```

3. **Appliquer un avertissement**
   ```
   POST /moderation/actions
   Body: { "action": "WARNING", ... }
   ```

4. **Vérifier l'historique**
   ```
   GET /moderation/history/:userId
   → Voir l'action appliquée
   ```

5. **L'utilisateur vérifie ses avertissements**
   ```
   GET /moderation/warnings/me
   → Voir 1 avertissement non lu
   ```

6. **Marquer comme lu**
   ```
   PATCH /moderation/warnings/me/read
   ```

7. **Révoquer l'action**
   ```
   POST /moderation/revoke/:actionId
   → Vérifier que isActive = false
   ```

---

### Scénario 3 : Test de sécurité

1. **Accès sans authentification**
   ```
   GET /auth/profile (sans header Authorization)
   → Doit retourner 401 Unauthorized
   ```

2. **Accès modération sans rôle admin**
   ```
   POST /moderation/actions (avec token USER)
   → Doit retourner 403 Forbidden
   ```

3. **Token expiré**
   ```
   GET /auth/profile (avec vieux token)
   → Doit retourner 401 Unauthorized
   ```

4. **Tentative de connexion compte banni**
   ```
   POST /auth/login/email (compte avec status = BANNED)
   → Doit retourner 403 Forbidden
   ```

---

## 🐛 Dépannage

### Erreur : "Le nom 'describe' est introuvable"

**Cause:** Types Jest non installés ou mal configurés.

**Solution:**
```bash
yarn add -D @types/jest @types/node
```

### Erreur : "Impossible d'appeler cette expression. Le type 'typeof supertest' n'a aucune signature d'appel"

**Cause:** Import incorrect de supertest.

**Solution:** Utiliser `import request from 'supertest'` au lieu de `import * as request from 'supertest'`

### Erreur : "Module '@prisma/client' has no exported member 'User'"

**Cause:** Client Prisma non généré après modification du schéma.

**Solution:**
```bash
yarn prisma:generate
```

### Erreur de connexion à la base de données

**Cause:** PostgreSQL non démarré ou URL de connexion incorrecte.

**Solution:**
```bash
# Vérifier que PostgreSQL est démarré
# Windows:
sc query postgresql

# Vérifier l'URL dans .env
DATABASE_URL="postgresql://user:password@localhost:5432/tajdeed_db"
```

### Token de vérification non reçu

**Cause:** Configuration email incorrecte.

**Solution:** Pendant les tests, les tokens sont affichés dans les logs du serveur. Activez les logs verbeux :

```env
LOG_LEVEL=debug
```

---

## 📊 Couverture de code

Pour vérifier la couverture des tests :

```bash
yarn test:cov
```

Objectif de couverture :
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

---

## 🔗 Ressources supplémentaires

- [Documentation NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Documentation Better Auth](https://better-auth.com)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [Documentation Supertest](https://github.com/visionmedia/supertest)

---

## ✅ Checklist finale

Avant de soumettre ou déployer :

- [ ] Tous les tests automatiques passent
- [ ] Tests manuels sur tous les endpoints effectués
- [ ] Scénarios de sécurité vérifiés
- [ ] Variables d'environnement configurées
- [ ] Base de données initialisée
- [ ] Documentation à jour
- [ ] Logs propres sans erreurs

---

**Bon testing! 🎉**

Pour toute question ou problème, consultez la documentation ou créez une issue sur le repository.
