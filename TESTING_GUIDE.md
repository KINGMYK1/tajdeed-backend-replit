# 📋 Guide de Test Complet - Tajdeed Backend API

**Version**: 1.0.0  
**Date**: Octobre 2025  
**Auteur**: Équipe Tajdeed

---

## 🎯 Introduction

Ce guide vous permettra de tester **toutes les fonctionnalités d'authentification et de modération** de Tajdeed. Il est conçu pour être simple et complet, même pour un stagiaire débutant.

### Outils nécessaires
- **Postman** ou **Insomnia** (téléchargez l'un des deux)
- Le serveur backend Tajdeed en cours d'exécution sur `http://localhost:3000`

---

## 🚀 Démarrage Rapide

### 1. Démarrer le serveur

```bash
cd tajdeed-backend-replit
yarn install
yarn start
```

Le serveur devrait afficher : `Application is running on: http://localhost:3000`

### 2. Importer la collection dans Postman

Vous pouvez importer le fichier `postman-collection.json` (voir annexe) ou créer manuellement les requêtes ci-dessous.

---

## 📝 Tests des Endpoints - Étape par Étape

### 🔐 PARTIE 1 : AUTHENTIFICATION EMAIL/MOT DE PASSE

---

#### **TEST 1 : Inscription d'un nouvel utilisateur**

**Objectif** : Créer un nouveau compte utilisateur avec email et mot de passe.

**Endpoint** : `POST http://localhost:3000/auth/register`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "email": "testuser@example.com",
  "password": "Password123!",
  "name": "Jean Dupont",
  "username": "jeandupont"
}
```

**Réponse attendue** (201 Created) :
```json
{
  "message": "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
  "userId": "uuid-generated-here"
}
```

**✅ Résultat** : Un email de vérification est envoyé à l'adresse fournie.

**📝 Notes** :
- Le mot de passe doit contenir au moins 8 caractères
- L'email doit être unique
- L'utilisateur ne peut pas se connecter tant que son email n'est pas vérifié

**🔴 Erreurs possibles** :
- `400 Bad Request` : Email déjà utilisé ou mot de passe faible
- `500 Internal Server Error` : Problème serveur ou base de données

---

#### **TEST 2 : Vérification d'email**

**Objectif** : Activer le compte en utilisant le token reçu par email.

**Endpoint** : `POST http://localhost:3000/auth/verify-email`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "token": "verification-token-from-email"
}
```

**Réponse attendue** (200 OK) - Sans auto-login :
```json
{
  "message": "Email vérifié avec succès. Vous pouvez maintenant vous connecter."
}
```

**OU avec auto-login activé** :
```json
{
  "message": "Email vérifié avec succès. Vous êtes maintenant connecté.",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh-token-here"
}
```

**✅ Résultat** : Le compte est activé et prêt à être utilisé.

**📝 Notes** :
- Le token de vérification expire après 1 heure
- Un token ne peut être utilisé qu'une seule fois
- Si le token est expiré, utilisez l'endpoint de renvoi

---

#### **TEST 3 : Renvoyer un email de vérification**

**Objectif** : Renvoyer un email de vérification si le premier a expiré ou n'a pas été reçu.

**Endpoint** : `POST http://localhost:3000/auth/resend-verification`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "email": "testuser@example.com"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "message": "Email de vérification renvoyé avec succès."
}
```

**📝 Notes** :
- Les anciens tokens de vérification sont automatiquement supprimés
- Un nouveau token est généré avec une nouvelle expiration de 1 heure

---

#### **TEST 4 : Connexion avec email et mot de passe**

**Objectif** : Se connecter avec les identifiants et obtenir les tokens d'accès.

**Endpoint** : `POST http://localhost:3000/auth/login`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "email": "testuser@example.com",
  "password": "Password123!"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "long-refresh-token-string-here",
  "user": {
    "id": "user-uuid-here",
    "username": "jeandupont",
    "role": "USER"
  },
  "expiresIn": 900,
  "emailVerified": true,
  "status": "ACTIVE"
}
```

**✅ Résultat** : 
- `accessToken` : Utilisez ce token pour accéder aux endpoints protégés (expire en 15 minutes)
- `refreshToken` : Utilisez ce token pour renouveler l'access token (valide 30 jours)

**🔴 Erreurs possibles** :
- `401 Unauthorized` : Email ou mot de passe incorrect
- `403 Forbidden` : Email non vérifié ou compte suspendu/banni
- `400 Bad Request` : Données invalides

**📝 Important** : **SAUVEGARDEZ l'accessToken** pour les tests suivants !

---

#### **TEST 5 : Récupérer le profil utilisateur**

**Objectif** : Obtenir les informations de l'utilisateur connecté.

**Endpoint** : `GET http://localhost:3000/auth/me`

**Headers** :
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Réponse attendue** (200 OK) :
```json
{
  "id": "user-uuid-here",
  "username": "jeandupont",
  "role": "USER",
  "createdAt": "2025-10-01T10:30:00.000Z",
  "updatedAt": "2025-10-01T10:30:00.000Z"
}
```

**🔴 Erreurs possibles** :
- `401 Unauthorized` : Token manquant ou invalide
- `403 Forbidden` : Token expiré

---

#### **TEST 6 : Rafraîchir le token d'accès**

**Objectif** : Obtenir un nouveau access token sans se reconnecter.

**Endpoint** : `POST http://localhost:3000/auth/refresh`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "refreshToken": "your-refresh-token-from-login"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "accessToken": "new-access-token-here",
  "refreshToken": "new-refresh-token-here",
  "user": {
    "id": "user-uuid-here",
    "username": "jeandupont",
    "role": "USER"
  },
  "expiresIn": 900
}
```

**📝 Notes** :
- L'ancien refresh token devient invalide
- Utilisez toujours le nouveau refresh token pour les prochaines requêtes
- Le refresh token expire après 30 jours

---

#### **TEST 7 : Déconnexion**

**Objectif** : Déconnecter l'utilisateur et invalider la session.

**Endpoint** : `POST http://localhost:3000/auth/logout`

**Headers** :
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Réponse attendue** (204 No Content) :
```
(Pas de body, juste status 204)
```

**✅ Résultat** : La session est supprimée, les tokens ne sont plus valides.

---

#### **TEST 8 : Demande de réinitialisation de mot de passe**

**Objectif** : Recevoir un email avec un lien pour réinitialiser le mot de passe.

**Endpoint** : `POST http://localhost:3000/auth/forgot-password`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "email": "testuser@example.com"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "message": "Si l'adresse email existe, un lien de réinitialisation a été envoyé."
}
```

**📝 Notes** :
- Cette réponse est identique que l'email existe ou non (sécurité)
- Un email est envoyé si l'adresse existe
- Le lien expire après 1 heure

---

#### **TEST 9 : Réinitialiser le mot de passe**

**Objectif** : Définir un nouveau mot de passe avec le token reçu par email.

**Endpoint** : `POST http://localhost:3000/auth/reset-password`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword456!"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."
}
```

**🔴 Erreurs possibles** :
- `400 Bad Request` : Token invalide ou expiré
- `400 Bad Request` : Nouveau mot de passe trop faible

**📝 Notes** : Après cette opération, reconnectez-vous avec le nouveau mot de passe.

---

### 👥 PARTIE 2 : MODÉRATION (Admin/Modérateur uniquement)

Pour tester les endpoints de modération, vous devez d'abord créer un utilisateur avec le rôle `ADMIN` ou `MODERATOR` dans la base de données.

---

#### **TEST 10 : Appliquer une action de modération**

**Objectif** : Avertir, suspendre ou bannir un utilisateur.

**Endpoint** : `POST http://localhost:3000/moderation/action`

**Headers** :
```
Authorization: Bearer ADMIN_ACCESS_TOKEN_HERE
Content-Type: application/json
```

**Body (JSON)** - Exemple 1 : Avertissement
```json
{
  "userId": "target-user-id",
  "action": "WARNING",
  "reason": "Contenu inapproprié dans les annonces",
  "evidence": "https://example.com/proof.jpg",
  "notes": "Premier avertissement pour cet utilisateur"
}
```

**Body (JSON)** - Exemple 2 : Suspension temporaire
```json
{
  "userId": "target-user-id",
  "action": "TEMPORARY_SUSPENSION",
  "reason": "Récidive de comportement abusif",
  "duration": 168,
  "evidence": "https://example.com/proof2.jpg",
  "notes": "Suspension de 7 jours (168 heures)"
}
```

**Body (JSON)** - Exemple 3 : Bannissement permanent
```json
{
  "userId": "target-user-id",
  "action": "PERMANENT_BAN",
  "reason": "Fraude avérée et répétée",
  "evidence": "https://example.com/proof3.jpg",
  "notes": "Bannissement définitif après enquête"
}
```

**Réponse attendue** (201 Created) :
```json
{
  "message": "Action de modération \"WARNING\" appliquée avec succès",
  "actionId": "action-uuid-here"
}
```

**📝 Notes** :
- `duration` est requis pour `TEMPORARY_SUSPENSION` (en heures)
- Un email est automatiquement envoyé à l'utilisateur
- Les modérateurs ne peuvent pas bannir définitivement (seuls les admins)

---

#### **TEST 11 : Ajouter un avertissement simple**

**Objectif** : Ajouter un avertissement rapide avec niveau de gravité.

**Endpoint** : `POST http://localhost:3000/moderation/warning`

**Headers** :
```
Authorization: Bearer ADMIN_ACCESS_TOKEN_HERE
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "userId": "target-user-id",
  "reason": "Langage inapproprié dans les messages",
  "severity": "MEDIUM"
}
```

**Niveaux de gravité** :
- `LOW` : Avertissement léger (jaune)
- `MEDIUM` : Avertissement moyen (orange)
- `HIGH` : Avertissement sérieux (rouge)
- `CRITICAL` : Avertissement critique (rouge foncé)

**Réponse attendue** (201 Created) :
```json
{
  "message": "Avertissement ajouté avec succès",
  "warningId": "warning-uuid-here"
}
```

---

#### **TEST 12 : Consulter l'historique de modération d'un utilisateur**

**Objectif** : Voir toutes les actions de modération appliquées à un utilisateur.

**Endpoint** : `GET http://localhost:3000/moderation/user/{userId}/history`

**Headers** :
```
Authorization: Bearer ADMIN_ACCESS_TOKEN_HERE
```

**Exemple** :
```
GET http://localhost:3000/moderation/user/123e4567-e89b-12d3-a456-426614174000/history
```

**Réponse attendue** (200 OK) :
```json
{
  "currentStatus": "ACTIVE",
  "moderationActions": [
    {
      "id": "action-uuid",
      "action": "WARNING",
      "reason": "Contenu inapproprié",
      "createdAt": "2025-10-01T10:00:00.000Z",
      "moderator": {
        "id": "mod-uuid",
        "username": "admin_user"
      },
      "isActive": true
    }
  ],
  "warnings": [
    {
      "id": "warning-uuid",
      "reason": "Langage inapproprié",
      "severity": "MEDIUM",
      "isRead": false,
      "createdAt": "2025-10-01T11:00:00.000Z"
    }
  ]
}
```

---

#### **TEST 13 : Lister les utilisateurs modérés**

**Endpoint** : `GET http://localhost:3000/moderation/users`

**Headers** :
```
Authorization: Bearer ADMIN_ACCESS_TOKEN_HERE
```

**Query Parameters (optionnels)** :
```
?status=BANNED&page=1&limit=20
```

**Réponse attendue** (200 OK) :
```json
{
  "users": [
    {
      "id": "user-uuid",
      "username": "problematic_user",
      "status": "BANNED",
      "latestAction": {
        "action": "PERMANENT_BAN",
        "reason": "Fraude répétée",
        "createdAt": "2025-10-01T09:00:00.000Z"
      }
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

#### **TEST 14 : Révoquer une action de modération**

**Objectif** : Annuler une suspension ou un bannissement.

**Endpoint** : `PUT http://localhost:3000/moderation/action/{actionId}/revoke`

**Headers** :
```
Authorization: Bearer ADMIN_ACCESS_TOKEN_HERE
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "reason": "Erreur de jugement, l'utilisateur a été réhabilité après enquête"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "message": "Action de modération révoquée avec succès"
}
```

---

#### **TEST 15 : Statistiques de modération**

**Endpoint** : `GET http://localhost:3000/moderation/stats`

**Headers** :
```
Authorization: Bearer ADMIN_ACCESS_TOKEN_HERE
```

**Réponse attendue** (200 OK) :
```json
{
  "totalActions": 45,
  "pendingWarnings": 8,
  "bannedUsers": 3,
  "suspendedUsers": 5,
  "actionsThisMonth": 12,
  "topReasons": [
    {
      "reason": "Contenu inapproprié",
      "count": 15
    },
    {
      "reason": "Fraude",
      "count": 8
    }
  ]
}
```

---

#### **TEST 16 : Consulter les avertissements d'un utilisateur**

**Endpoint** : `GET http://localhost:3000/moderation/user/{userId}/warnings`

**Headers** :
```
Authorization: Bearer USER_ACCESS_TOKEN_HERE
```

**Réponse attendue** (200 OK) :
```json
{
  "warnings": [
    {
      "id": "warning-uuid",
      "reason": "Langage inapproprié dans les messages",
      "severity": "MEDIUM",
      "isRead": false,
      "createdAt": "2025-10-01T11:00:00.000Z",
      "expiresAt": null
    }
  ],
  "unreadCount": 1
}
```

---

#### **TEST 17 : Marquer les avertissements comme lus**

**Endpoint** : `PUT http://localhost:3000/moderation/warnings/read`

**Headers** :
```
Authorization: Bearer USER_ACCESS_TOKEN_HERE
```

**Réponse attendue** (200 OK) :
```json
{
  "message": "Avertissements marqués comme lus"
}
```

---

### 🔐 PARTIE 3 : AUTHENTIFICATION GOOGLE (Optionnel)

Ces tests nécessitent une configuration Google OAuth.

#### **TEST 18 : Connexion avec Google**

**Endpoint** : `POST http://localhost:3000/auth/google`

**Headers** :
```
Content-Type: application/json
```

**Body (JSON)** :
```json
{
  "code": "google-authorization-code-here"
}
```

**Réponse attendue** (200 OK) :
```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "refresh-token-here",
  "user": {
    "id": "user-uuid",
    "username": "google_user",
    "role": "USER"
  },
  "expiresIn": 900
}
```

---

## 🎓 Scénarios de Test Complets

### Scénario 1 : Nouveau utilisateur classique

1. **Inscription** (TEST 1) → Obtenir userId
2. **Vérifier email** (TEST 2) avec le token reçu
3. **Connexion** (TEST 4) → Obtenir accessToken
4. **Profil** (TEST 5) avec l'accessToken
5. **Déconnexion** (TEST 7)

### Scénario 2 : Utilisateur qui oublie son mot de passe

1. **Demander réinitialisation** (TEST 8)
2. **Réinitialiser mot de passe** (TEST 9) avec le token
3. **Connexion** (TEST 4) avec le nouveau mot de passe

### Scénario 3 : Admin modérant un utilisateur problématique

1. **Connexion admin** (TEST 4) avec compte admin
2. **Ajouter avertissement** (TEST 11) à l'utilisateur
3. **Consulter historique** (TEST 12) de l'utilisateur
4. **Appliquer suspension** (TEST 10) si récidive
5. **Consulter statistiques** (TEST 15) générales

---

## 🚨 Gestion des Erreurs Courantes

### Erreur 401 Unauthorized
- **Cause** : Token manquant, invalide ou expiré
- **Solution** : Reconnectez-vous et utilisez le nouveau token

### Erreur 403 Forbidden
- **Cause** : Pas les permissions nécessaires ou compte suspendu
- **Solution** : Vérifiez le rôle de l'utilisateur ou le statut du compte

### Erreur 400 Bad Request
- **Cause** : Données invalides dans la requête
- **Solution** : Vérifiez le format des données (email, mot de passe, etc.)

### Erreur 500 Internal Server Error
- **Cause** : Problème serveur ou base de données
- **Solution** : Vérifiez les logs du serveur et la connexion à la base de données

---

## 📊 Collection Postman

### Importer la collection

1. Ouvrez Postman
2. Cliquez sur "Import"
3. Collez le JSON ci-dessous
4. Cliquez sur "Import"

```json
{
  "info": {
    "name": "Tajdeed Backend API",
    "description": "Collection complète pour tester l'API Tajdeed",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth - Register",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"testuser@example.com\",\n  \"password\": \"Password123!\",\n  \"name\": \"Jean Dupont\",\n  \"username\": \"jeandupont\"\n}"
        },
        "url": {"raw": "http://localhost:3000/auth/register"}
      }
    },
    {
      "name": "Auth - Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"testuser@example.com\",\n  \"password\": \"Password123!\"\n}"
        },
        "url": {"raw": "http://localhost:3000/auth/login"}
      }
    },
    {
      "name": "Auth - Get Profile",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
        "url": {"raw": "http://localhost:3000/auth/me"}
      }
    }
  ],
  "variable": [
    {"key": "accessToken", "value": ""},
    {"key": "refreshToken", "value": ""}
  ]
}
```

---

## ✅ Checklist de Test

Avant de valider une fonctionnalité, vérifiez :

- [ ] L'endpoint retourne le bon code HTTP
- [ ] La structure de la réponse correspond à la documentation
- [ ] Les erreurs sont bien gérées (401, 403, 400, 500)
- [ ] Les tokens sont correctement générés et validés
- [ ] Les emails de notification sont envoyés
- [ ] Les données sont correctement enregistrées en base de données
- [ ] Les permissions sont respectées (USER vs ADMIN vs MODERATOR)

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez que le serveur est bien démarré
2. Consultez les logs serveur dans le terminal
3. Vérifiez que votre base de données est accessible
4. Consultez le fichier `.env` pour les variables d'environnement
5. Contactez l'équipe de développement

---

## 📚 Annexes

### Variables d'environnement requises

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tajdeed"
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APP_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@tajdeed.com"
SMTP_PASS="your-smtp-password"
```

### Codes de statut utilisateur

- `ACTIVE` : Compte actif et fonctionnel
- `SUSPENDED` : Compte suspendu temporairement
- `BANNED` : Compte banni définitivement
- `PENDING_VERIFICATION` : Email non vérifié

### Rôles utilisateur

- `USER` : Utilisateur standard (peut acheter/vendre)
- `MODERATOR` : Modérateur (peut avertir et suspendre temporairement)
- `ADMIN` : Administrateur (toutes les actions de modération)
- `SUPER_ADMIN` : Super administrateur (peut modérer les admins)

---

**Fin du Guide de Test**

*Dernière mise à jour : Octobre 2025*
