# 📚 API Tajdeed - Documentation Complète des Endpoints

**Version API** : 2.1.0  
**Date** : 11 octobre 2025  
**Base URL** : `http://localhost:3000` (dev) | `https://api.tajdeed.com` (prod)

---

## 📖 Table des Matières

1. [Introduction & Architecture](#introduction--architecture)
2. [Authentification & Sécurité](#authentification--sécurité)
3. [Endpoints Authentification](#endpoints-authentification)
4. [Endpoints Google OAuth](#endpoints-google-oauth)
5. [Endpoints Administration](#endpoints-administration)
6. [Endpoints Modération](#endpoints-modération)
7. [Codes d'Erreur](#codes-derreur)
8. [Exemples d'Intégration](#exemples-dintégration)

---

## 🏗️ Introduction & Architecture

### Principes Généraux

L'API Tajdeed est une **API REST** construite avec **NestJS** et **TypeScript**. Elle utilise :

- **Authentification JWT** : Access token (15 min) + Refresh token (30 jours)
- **Codes de vérification 6 chiffres** : Pour email et reset password
- **Google OAuth 2.0** : Connexion via Google
- **Système de rôles** : USER, MODERATOR, ADMIN, SUPER_ADMIN
- **Base de données PostgreSQL** : Via Prisma ORM

### Format des Réponses

Toutes les réponses sont au format **JSON** :

```json
// Succès
{
  "message": "Action réussie",
  "data": { ... }
}

// Erreur
{
  "statusCode": 400,
  "message": "Message d'erreur",
  "error": "Bad Request"
}
```

### Headers Requis

```http
Content-Type: application/json
Authorization: Bearer <access_token>  (pour routes protégées)
```

---

## 🔐 Authentification & Sécurité

### Système d'Authentification

L'API utilise **deux méthodes d'authentification** :

#### 1. Email/Password avec Codes 6 Chiffres

Au lieu d'envoyer de longs tokens JWT dans les emails, nous utilisons des **codes numériques à 6 chiffres** :

- **Plus simple** : `123456` au lieu de `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Meilleure UX** : Facile à copier sur mobile
- **Sécurisé** : Expire après 15 minutes, usage unique
- **Deux types** : `EMAIL_VERIFICATION` et `PASSWORD_RESET`

#### 2. Google OAuth 2.0

Connexion via compte Google :

- **Flux OAuth standard** : Redirect → Google login → Callback
- **Email auto-vérifié** : Pas besoin de code 6 chiffres
- **Compte auto-créé** : Si premier login
- **Compte lié** : Si email existe déjà

### Tokens JWT

#### Access Token

- **Durée** : 15 minutes
- **Utilisation** : Authentification des requêtes
- **Header** : `Authorization: Bearer <access_token>`
- **Payload** :
  ```json
  {
    "sub": "user_id",
    "sessionId": "session_id",
    "iat": 1696680000,
    "exp": 1696680900
  }
  ```

#### Refresh Token

- **Durée** : 30 jours
- **Utilisation** : Renouveler l'access token
- **Stockage** : Base de données (sessions)
- **Format** : UUID aléatoire (32 caractères hex)

### Système de Rôles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **USER** | Utilisateur standard | Accès basique, profil personnel |
| **MODERATOR** | Modérateur | Actions de modération limitées |
| **ADMIN** | Administrateur | Gestion utilisateurs, modération complète |
| **SUPER_ADMIN** | Super administrateur | Toutes permissions + gestion admins |

### Statuts Utilisateur

| Statut | Description |
|--------|-------------|
| **PENDING_VERIFICATION** | Email non vérifié |
| **ACTIVE** | Compte actif et fonctionnel |
| **SUSPENDED** | Compte suspendu temporairement |
| **BANNED** | Compte banni définitivement |

---

## 📍 Endpoints Authentification

### 1. POST /auth/register

**Description** : Créer un nouveau compte utilisateur

**Authentification** : ❌ Non requise

**Body** :
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Validation** :
- Email : Format email valide, unique
- Password : Min 8 caractères, max 128
- Name : Requis, non vide

**Réponse 201** :
```json
{
  "message": "Inscription réussie. Un code de vérification à 6 chiffres a été envoyé à votre email.",
  "userId": "303eba33-934e-490f-9206-6f706b93ff4a"
}
```

**Email envoyé** :
```
Sujet: Bienvenue sur Tajdeed - Vérifiez votre email
Corps: Votre code de vérification : 123456
Expire dans : 15 minutes
```

**Erreurs** :
- `409 Conflict` : Email déjà utilisé
- `400 Bad Request` : Données invalides

**Exemple cURL** :
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

---

### 2. POST /auth/verify-email

**Description** : Vérifier l'email avec le code à 6 chiffres

**Authentification** : ❌ Non requise

**Body** :
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Validation** :
- Email : Format valide
- Code : Exactement 6 chiffres numériques

**Réponse 200** :
```json
{
  "message": "Email vérifié avec succès",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "61b9aecbbe564e03a7ad88bc2eeb2ab4...",
  "user": {
    "id": "303eba33-934e-490f-9206-6f706b93ff4a",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

**Comportement** :
1. Vérifie le code 6 chiffres
2. Active le compte (status → ACTIVE)
3. Marque l'email comme vérifié
4. Crée une session automatiquement
5. Retourne access + refresh tokens (auto-login)

**Erreurs** :
- `400 Bad Request` : Code invalide ou expiré
- `404 Not Found` : Utilisateur non trouvé

---

### 3. POST /auth/login

**Description** : Connexion avec email/password

**Authentification** : ❌ Non requise

**Body** :
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Réponse 200** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "61b9aecbbe564e03a7ad88bc2eeb2ab4...",
  "user": {
    "id": "303eba33-934e-490f-9206-6f706b93ff4a",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "emailVerified": true
  }
}
```

**Vérifications** :
1. Email existe
2. Email vérifié
3. Compte actif (pas suspendu/banni)
4. Mot de passe correct

---

### 4. POST /auth/refresh

**Description** : Renouveler l'access token

**Body** :
```json
{
  "refreshToken": "61b9aecbbe564e03a7ad88bc2eeb2ab4..."
}
```

**Réponse 200** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "61b9aecbbe564e03a7ad88bc2eeb2ab4...",
  "user": {
    "id": "303eba33-934e-490f-9206-6f706b93ff4a",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

---

### 5. GET /auth/me

**Description** : Récupérer le profil de l'utilisateur connecté

**Authentification** : ✅ Requise (Bearer token)

**Headers** :
```http
Authorization: Bearer <access_token>
```

**Réponse 200** :
```json
{
  "id": "303eba33-934e-490f-9206-6f706b93ff4a",
  "email": "user@example.com",
  "name": "John Doe",
  "username": null,
  "emailVerified": true,
  "role": "USER",
  "status": "ACTIVE",
  "createdAt": "2025-10-01T10:00:00.000Z",
  "updatedAt": "2025-10-01T10:00:00.000Z"
}
```

---

### 6. POST /auth/logout

**Description** : Déconnexion et révocation de la session

**Authentification** : ✅ Requise

**Réponse 200** :
```json
{
  "message": "Déconnexion réussie"
}
```

---

### 7. POST /auth/forgot-password

**Description** : Demander un code de réinitialisation de mot de passe

**Body** :
```json
{
  "email": "user@example.com"
}
```

**Réponse 200** :
```json
{
  "message": "Un code de réinitialisation à 6 chiffres a été envoyé à votre email."
}
```

---

### 8. POST /auth/reset-password

**Description** : Réinitialiser le mot de passe avec le code 6 chiffres

**Body** :
```json
{
  "email": "user@example.com",
  "code": "789012",
  "newPassword": "NewSecurePass456!"
}
```

**Réponse 200** :
```json
{
  "message": "Mot de passe réinitialisé avec succès"
}
```

---

### 9. POST /auth/resend-verification

**Description** : Renvoyer un nouveau code de vérification

**Body** :
```json
{
  "email": "user@example.com"
}
```

**Réponse 200** :
```json
{
  "message": "Un nouveau code de vérification à 6 chiffres a été envoyé à votre email."
}
```

---

## 🌐 Endpoints Google OAuth

### 10. GET /auth/google

**Description** : Obtenir l'URL d'authentification Google

**Réponse 200** :
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "message": "Redirigez l'utilisateur vers cette URL pour se connecter avec Google"
}
```

---

### 11. GET /auth/google/callback

**Description** : Callback automatique après connexion Google

**Query Params** :
- `code` : Code d'autorisation Google (requis)

**Réponse 200** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid-here...",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

---

### 12. POST /auth/google

**Description** : Connexion Google avec le code d'autorisation

**Body** :
```json
{
  "code": "4/0AfJohXkT_xxxxxxxxxxxxxxxxxx"
}
```

**Réponse 200** : (identique au callback)

---

## 👑 Endpoints Administration

### 13. POST /auth/admin/create

**Description** : Créer un nouvel administrateur/modérateur

**Authentification** : ✅ ADMIN ou SUPER_ADMIN

**Body** :
```json
{
  "email": "moderator@tajdeed.com",
  "password": "SecureMod123!",
  "name": "New Moderator",
  "role": "MODERATOR"
}
```

**Rôles disponibles** : MODERATOR, ADMIN, SUPER_ADMIN

**Réponse 201** :
```json
{
  "message": "Administrateur MODERATOR créé avec succès",
  "admin": {
    "id": "uuid-here",
    "email": "moderator@tajdeed.com",
    "name": "New Moderator",
    "role": "MODERATOR"
  }
}
```

---

### 14. GET /auth/admin/list

**Description** : Lister tous les administrateurs

**Authentification** : ✅ ADMIN

**Query Params** :
- `role` (optionnel) : Filtrer par rôle

**Réponse 200** :
```json
{
  "total": 5,
  "admins": [
    {
      "id": "uuid-1",
      "email": "admin@tajdeed.com",
      "name": "Admin Principal",
      "role": "SUPER_ADMIN",
      "status": "ACTIVE",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 15. GET /auth/admin/stats

**Description** : Statistiques globales des utilisateurs

**Authentification** : ✅ ADMIN

**Réponse 200** :
```json
{
  "total": 1523,
  "active": 1402,
  "suspended": 98,
  "byRole": {
    "USER": 1510,
    "MODERATOR": 8,
    "ADMIN": 4,
    "SUPER_ADMIN": 1
  }
}
```

---

### 16. GET /auth/admin/users

**Description** : Lister les utilisateurs avec filtres et pagination

**Authentification** : ✅ ADMIN

**Query Params** :
- `role`, `status`, `page`, `limit`

**Réponse 200** :
```json
{
  "users": [...],
  "pagination": {
    "total": 1523,
    "page": 1,
    "limit": 20,
    "pages": 77
  }
}
```

---

### 17. PUT /auth/admin/user/:userId/role

**Description** : Modifier le rôle d'un utilisateur

**Authentification** : ✅ ADMIN

**Body** :
```json
{
  "role": "MODERATOR"
}
```

---

### 18. PUT /auth/admin/user/:userId/suspend

**Description** : Suspendre un utilisateur

**Authentification** : ✅ ADMIN

**Body** :
```json
{
  "reason": "Violation des règles",
  "duration": 168
}
```

---

### 19. PUT /auth/admin/user/:userId/activate

**Description** : Réactiver un utilisateur suspendu

**Authentification** : ✅ ADMIN

---

### 20. DELETE /auth/admin/:userId

**Description** : Supprimer un administrateur

**Authentification** : ✅ SUPER_ADMIN uniquement

---

## 👮 Endpoints Modération

### 21. POST /moderation/action

**Description** : Appliquer une action de modération

**Authentification** : ✅ ADMIN

**Body** :
```json
{
  "userId": "uuid-target-user",
  "action": "TEMPORARY_SUSPENSION",
  "reason": "Spam répété",
  "duration": 72
}
```

**Actions** : WARNING, TEMPORARY_SUSPENSION, PERMANENT_BAN, CONTENT_REMOVAL, ACCOUNT_RESTRICTION

---

### 22. POST /moderation/warning

**Description** : Ajouter un avertissement

**Authentification** : ✅ ADMIN

**Body** :
```json
{
  "userId": "uuid-target",
  "reason": "Langage inapproprié",
  "severity": "MEDIUM"
}
```

**Sévérités** : LOW, MEDIUM, HIGH, CRITICAL

---

### 23. GET /moderation/user/:userId/history

**Description** : Historique de modération d'un utilisateur

**Authentification** : ✅ ADMIN

---

### 24. GET /moderation/users

**Description** : Liste des utilisateurs modérés

**Authentification** : ✅ ADMIN

**Query Params** : `status`, `action`, `page`, `limit`

---

### 25. PUT /moderation/action/:actionId/revoke

**Description** : Révoquer une action de modération

**Authentification** : ✅ ADMIN

**Body** :
```json
{
  "reason": "Révision après appel"
}
```

---

### 26. GET /moderation/stats

**Description** : Statistiques de modération

**Authentification** : ✅ ADMIN

**Réponse 200** :
```json
{
  "totalActions": 342,
  "activeWarnings": 89,
  "bannedUsers": 12,
  "suspendedUsers": 34,
  "actionsThisMonth": 67,
  "topReasons": [...]
}
```

---

### 27. GET /moderation/my-warnings

**Description** : Consulter ses propres avertissements

**Authentification** : ✅ Utilisateur connecté

---

### 28. PUT /moderation/my-warnings/read

**Description** : Marquer ses avertissements comme lus

**Authentification** : ✅ Utilisateur connecté

---

## ❌ Codes d'Erreur

| Code | Signification |
|------|---------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## 💻 Exemple d'Intégration Frontend

```javascript
// API Client
class TajdeedAPI {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.authenticated && { 'Authorization': `Bearer ${this.accessToken}` })
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    return response;
  }

  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export default new TajdeedAPI();
```

---

**Fin de la documentation** 🚀
