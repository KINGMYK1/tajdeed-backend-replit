# 📖 Guide de Test Manuel - Tajdeed Backend

Ce guide vous permet de tester manuellement toutes les fonctionnalités d'authentification et de modération via Postman, Insomnia ou curl.

## 🚀 Pré-requis

1. Le serveur doit être démarré : `yarn start`
2. La base de données doit être configurée : `npx prisma db push`
3. Avoir Postman ou Insomnia installé (ou utiliser curl)

**Base URL**: `http://localhost:3000`

---

## 🔐 Tests d'Authentification

### 1. Inscription (Email/Mot de passe)

**Endpoint**: `POST /auth/register`

**Body**:
```json
{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "name": "Test User",
  "username": "testuser"
}
```

**Réponse attendue** (201):
```json
{
  "userId": "uuid-here"
}
```

**Notes**:
- Le mot de passe doit contenir au moins 8 caractères
- L'email doit être unique
- L'utilisateur aura le statut `PENDING_VERIFICATION`

---

### 2. Vérification d'Email

**Note**: Dans l'environnement de développement, le token de vérification est affiché dans les logs du serveur.

**Endpoint**: `POST /auth/verify-email`

**Body**:
```json
{
  "token": "verification-token-from-logs"
}
```

**Réponse attendue** (200):
```json
{
  "autoSignIn": true,
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

---

### 3. Connexion

**Endpoint**: `POST /auth/login`

**Body**:
```json
{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Réponse attendue** (200):
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "refresh-token-here",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "username": "testuser",
    "role": "USER"
  },
  "expiresIn": 900
}
```

**⚠️ Important**: Sauvegardez le `accessToken` pour les requêtes suivantes !

---

### 4. Récupérer le Profil

**Endpoint**: `GET /auth/me`

**Headers**:
```
Authorization: Bearer {votre-access-token}
```

**Réponse attendue** (200):
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "name": "Test User",
  "username": "testuser",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerified": true
}
```

---

### 5. Rafraîchir le Token

**Endpoint**: `POST /auth/refresh`

**Body**:
```json
{
  "refreshToken": "votre-refresh-token"
}
```

**Réponse attendue** (200):
```json
{
  "accessToken": "nouveau-jwt-token",
  "refreshToken": "nouveau-refresh-token",
  "user": { ... },
  "expiresIn": 900
}
```

---

### 6. Renvoyer l'Email de Vérification

**Endpoint**: `POST /auth/resend-verification`

**Body**:
```json
{
  "email": "test@example.com"
}
```

**Réponse attendue** (200):
```json
{
  "message": "Email de vérification renvoyé avec succès"
}
```

---

### 7. Déconnexion

**Endpoint**: `POST /auth/logout`

**Headers**:
```
Authorization: Bearer {votre-access-token}
```

**Réponse attendue** (200):
```json
{
  "message": "Déconnexion réussie"
}
```

---

## 👮 Tests de Modération

**⚠️ Pré-requis**: Vous devez avoir un utilisateur avec le rôle `ADMIN` ou `MODERATOR`.

### Créer un Admin (via Prisma Studio ou SQL)

```bash
# Ouvrir Prisma Studio
npx prisma studio

# Ou via SQL
# UPDATE users SET role = 'ADMIN' WHERE email = 'votre-email@example.com';
```

### 1. Créer une Action de Modération

**Endpoint**: `POST /moderation/action`

**Headers**:
```
Authorization: Bearer {admin-access-token}
```

**Body**:
```json
{
  "userId": "uuid-utilisateur-à-modérer",
  "action": "WARNING",
  "reason": "Contenu inapproprié",
  "evidence": "https://example.com/screenshot.png",
  "notes": "Premier avertissement",
  "duration": null
}
```

**Actions possibles**:
- `WARNING`: Avertissement simple
- `TEMPORARY_SUSPENSION`: Suspension temporaire (durée en heures)
- `PERMANENT_BAN`: Bannissement permanent
- `CONTENT_REMOVAL`: Suppression de contenu
- `ACCOUNT_RESTRICTION`: Restriction de compte

**Réponse attendue** (201):
```json
{
  "id": "action-uuid",
  "userId": "user-uuid",
  "moderatorId": "moderator-uuid",
  "action": "WARNING",
  "reason": "Contenu inapproprié",
  "isActive": true,
  "createdAt": "2025-01-01T10:00:00Z"
}
```

---

### 2. Créer un Avertissement

**Endpoint**: `POST /moderation/warning`

**Headers**:
```
Authorization: Bearer {admin-access-token}
```

**Body**:
```json
{
  "userId": "uuid-utilisateur",
  "reason": "Langage inapproprié",
  "severity": "MEDIUM"
}
```

**Niveaux de gravité**:
- `LOW`: Faible
- `MEDIUM`: Moyen
- `HIGH`: Élevé
- `CRITICAL`: Critique

**Réponse attendue** (201):
```json
{
  "id": "warning-uuid",
  "userId": "user-uuid",
  "reason": "Langage inapproprié",
  "severity": "MEDIUM",
  "isRead": false,
  "createdAt": "2025-01-01T10:00:00Z"
}
```

---

### 3. Voir l'Historique d'un Utilisateur

**Endpoint**: `GET /moderation/user/{userId}/history`

**Headers**:
```
Authorization: Bearer {admin-access-token}
```

**Réponse attendue** (200):
```json
{
  "currentStatus": "ACTIVE",
  "history": {
    "moderationActions": [
      {
        "id": "action-uuid",
        "action": "WARNING",
        "reason": "Contenu inapproprié",
        "createdAt": "2025-01-01T10:00:00Z",
        "moderator": {
          "id": "mod-uuid",
          "name": "Admin User"
        }
      }
    ],
    "warnings": [
      {
        "id": "warning-uuid",
        "reason": "Langage inapproprié",
        "severity": "MEDIUM",
        "createdAt": "2025-01-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 4. Lister les Utilisateurs Modérés

**Endpoint**: `GET /moderation/users`

**Headers**:
```
Authorization: Bearer {admin-access-token}
```

**Query Parameters** (optionnels):
- `status`: Filtrer par statut (`ACTIVE`, `SUSPENDED`, `BANNED`)
- `action`: Filtrer par type d'action
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre d'éléments par page (défaut: 10)

**Exemple**:
```
GET /moderation/users?status=BANNED&page=1&limit=20
```

**Réponse attendue** (200):
```json
{
  "users": [
    {
      "id": "action-uuid",
      "action": "PERMANENT_BAN",
      "reason": "Récidive",
      "createdAt": "2025-01-01T10:00:00Z",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "Banned User",
        "status": "BANNED"
      },
      "moderator": {
        "id": "mod-uuid",
        "name": "Admin"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 5. Révoquer une Action de Modération

**Endpoint**: `PUT /moderation/action/{actionId}/revoke`

**Headers**:
```
Authorization: Bearer {admin-access-token}
```

**Body**:
```json
{
  "reason": "Erreur de modération, action révoquée"
}
```

**Réponse attendue** (200):
```json
{
  "message": "Action révoquée avec succès"
}
```

---

### 6. Statistiques de Modération

**Endpoint**: `GET /moderation/stats`

**Headers**:
```
Authorization: Bearer {admin-access-token}
```

**Réponse attendue** (200):
```json
{
  "totalActions": 150,
  "activeWarnings": 45,
  "bannedUsers": 12,
  "suspendedUsers": 8,
  "actionsThisMonth": 23,
  "topReasons": [
    {
      "reason": "Contenu inapproprié",
      "count": 45
    },
    {
      "reason": "Spam",
      "count": 32
    }
  ]
}
```

---

### 7. Mes Avertissements (Utilisateur)

**Endpoint**: `GET /moderation/my-warnings`

**Headers**:
```
Authorization: Bearer {user-access-token}
```

**Réponse attendue** (200):
```json
{
  "warnings": [
    {
      "id": "warning-uuid",
      "reason": "Langage inapproprié",
      "severity": "MEDIUM",
      "isRead": false,
      "createdAt": "2025-01-01T10:00:00Z",
      "expiresAt": null
    }
  ],
  "unreadCount": 1
}
```

---

### 8. Marquer les Avertissements comme Lus

**Endpoint**: `PUT /moderation/my-warnings/read`

**Headers**:
```
Authorization: Bearer {user-access-token}
```

**Réponse attendue** (200):
```json
{
  "message": "Avertissements marqués comme lus"
}
```

---

## 🧪 Scénarios de Test Complets

### Scénario 1: Cycle Complet d'un Utilisateur

1. **Inscription** → Créer un compte
2. **Vérification** → Vérifier l'email (voir les logs)
3. **Connexion** → Se connecter
4. **Profil** → Récupérer le profil
5. **Refresh** → Rafraîchir le token
6. **Déconnexion** → Se déconnecter

### Scénario 2: Modération d'un Utilisateur

1. **Créer Admin** → Promouvoir un utilisateur en ADMIN
2. **Connexion Admin** → Se connecter avec le compte admin
3. **Warning** → Donner un premier avertissement
4. **Suspension** → Suspendre temporairement (ex: 48h)
5. **Historique** → Consulter l'historique
6. **Révocation** → Révoquer la suspension
7. **Ban** → Bannir définitivement si récidive

### Scénario 3: Gestion des Avertissements

1. **Connexion Utilisateur** → Se connecter
2. **Voir Warnings** → Consulter mes avertissements
3. **Marquer Lu** → Marquer comme lu
4. **Voir Stats** → (Admin) Voir les statistiques

---

## 📊 Codes de Statut HTTP

| Code | Signification |
|------|---------------|
| 200  | Succès |
| 201  | Créé avec succès |
| 400  | Requête invalide (données manquantes/incorrectes) |
| 401  | Non authentifié (token manquant/invalide) |
| 403  | Non autorisé (permissions insuffisantes) |
| 404  | Ressource non trouvée |
| 409  | Conflit (email déjà utilisé, etc.) |
| 500  | Erreur serveur |

---

## 🔍 Conseils de Débogage

### Voir les Logs du Serveur

```bash
yarn start
# Les logs affichent les tokens de vérification et autres informations
```

### Vérifier la Base de Données

```bash
npx prisma studio
# Interface graphique pour voir/modifier les données
```

### Tester avec curl

```bash
# Inscription
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","name":"Test"}'

# Connexion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!"}'

# Profil (avec token)
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

## 📝 Collection Postman

Une collection Postman complète est disponible dans `test/Tajdeed_API_Collection.postman.json`.

**Import dans Postman**:
1. Ouvrir Postman
2. File → Import
3. Sélectionner `Tajdeed_API_Collection.postman.json`
4. Toutes les requêtes seront prêtes à l'emploi

---

## ✅ Checklist de Test

### Authentification
- [ ] Inscription avec email/password
- [ ] Vérification d'email
- [ ] Connexion réussie
- [ ] Connexion échouée (mauvais mot de passe)
- [ ] Récupération du profil
- [ ] Rafraîchissement du token
- [ ] Déconnexion

### Modération (Admin)
- [ ] Créer un avertissement
- [ ] Créer une suspension temporaire
- [ ] Créer un ban permanent
- [ ] Voir l'historique d'un utilisateur
- [ ] Lister les utilisateurs modérés
- [ ] Révoquer une action
- [ ] Voir les statistiques

### Modération (Utilisateur)
- [ ] Voir mes avertissements
- [ ] Marquer les avertissements comme lus

---

## 🆘 Support

En cas de problème :
1. Vérifiez que le serveur est démarré
2. Vérifiez que la base de données est accessible
3. Consultez les logs du serveur
4. Vérifiez que les variables d'environnement sont correctes

Pour plus d'informations, consultez le `README.md` principal.
