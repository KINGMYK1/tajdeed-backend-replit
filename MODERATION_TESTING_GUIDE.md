# 🛡️ Guide de Test - Modération & Administration

**Version** : 2.0.0  
**Date** : 6 octobre 2025  
**Base URL** : `http://localhost:3000`

---

## 📋 Prérequis

### 1. Serveur Démarré
```bash
cd d:\Tajdeed\tajdeed-backend-replit
yarn start:dev
```

### 2. Compte Admin Créé
```bash
npx ts-node scripts/create-admin.ts
```

**Credentials Admin** :
- Email : `admin@tajdeed.com`
- Username : `MYK`
- Password : `MYK@123`
- Role : `ADMIN`

### 3. Compte Utilisateur Test

Créer un utilisateur normal pour les tests de modération (voir section TEST 0).

---

## 🔐 TEST 0 : Préparation - Créer un Utilisateur Test

### Inscription d'un utilisateur normal

**Requête** :
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "usertest@example.com",
  "password": "Test123!@#",
  "name": "User Test"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"usertest@example.com\",\"password\":\"Test123!@#\",\"name\":\"User Test\"}"
```

**Réponse** :
```json
{
  "message": "Compte créé. Vérifiez votre email pour le code de vérification.",
  "userId": "303eba33-934e-490f-9206-6f706b93ff4a"
}
```

📝 **Important** : Sauvegarder le `userId` pour les tests de modération.

### Vérifier l'email

**Requête** :
```http
POST http://localhost:3000/auth/verify-email
Content-Type: application/json

{
  "email": "usertest@example.com",
  "code": "123456"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/auth/verify-email ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"usertest@example.com\",\"code\":\"123456\"}"
```

---

## 🔑 TEST 1 : Connexion Admin

### Obtenir le Token Admin

**Requête** :
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@tajdeed.com",
  "password": "MYK@123"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@tajdeed.com\",\"password\":\"MYK@123\"}"
```

**Réponse Attendue** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "61b9aecbbe564e03a7ad88bc2eeb2ab4...",
  "user": {
    "id": "admin-uuid-here",
    "email": "admin@tajdeed.com",
    "name": "Administrateur Principal",
    "role": "ADMIN"
  }
}
```

### ✅ Vérifications
- [ ] Status 200 OK
- [ ] `role` = "ADMIN"
- [ ] `accessToken` présent
- [ ] `refreshToken` présent

📝 **Important** : Copier l'`accessToken` pour les tests suivants.

---

## ⚠️ TEST 2 : Appliquer un Avertissement (WARNING)

### Action : Donner un avertissement à un utilisateur

**Requête** :
```http
POST http://localhost:3000/moderation/action
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "userId": "303eba33-934e-490f-9206-6f706b93ff4a",
  "action": "WARNING",
  "reason": "Comportement inapproprié dans les commentaires",
  "severity": "MINOR"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/moderation/action ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"303eba33-934e-490f-9206-6f706b93ff4a\",\"action\":\"WARNING\",\"reason\":\"Comportement inapproprié\",\"severity\":\"MINOR\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Action de modération \"WARNING\" appliquée avec succès",
  "actionId": "action-uuid-here"
}
```

### ✅ Vérifications
- [ ] Status 201 Created
- [ ] `actionId` retourné
- [ ] Message de succès affiché

### 📊 Paramètres Disponibles

**Actions Disponibles** :
- `WARNING` - Avertissement simple
- `TEMPORARY_SUSPENSION` - Suspension temporaire
- `PERMANENT_BAN` - Bannissement permanent
- `CONTENT_REMOVAL` - Suppression de contenu
- `ACCOUNT_RESTRICTION` - Restriction de compte

**Niveaux de Sévérité** :
- `MINOR` - Mineur
- `MODERATE` - Modéré
- `SEVERE` - Sévère
- `CRITICAL` - Critique

---

## 🚫 TEST 3 : Suspension Temporaire

### Action : Suspendre un utilisateur pour 7 jours

**Requête** :
```http
POST http://localhost:3000/moderation/action
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "userId": "303eba33-934e-490f-9206-6f706b93ff4a",
  "action": "TEMPORARY_SUSPENSION",
  "reason": "Violation des règles de la communauté",
  "severity": "MODERATE",
  "duration": 7,
  "notes": "Deuxième infraction - suspension de 7 jours"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/moderation/action ^
  -H "Authorization: Bearer <ADMIN_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"303eba33-934e-490f-9206-6f706b93ff4a\",\"action\":\"TEMPORARY_SUSPENSION\",\"reason\":\"Violation des règles\",\"severity\":\"MODERATE\",\"duration\":7}"
```

**Réponse Attendue** :
```json
{
  "message": "Action de modération \"TEMPORARY_SUSPENSION\" appliquée avec succès",
  "actionId": "action-uuid-here"
}
```

### ✅ Vérifications
- [ ] Status 201 Created
- [ ] Action créée avec durée
- [ ] Utilisateur suspendu pour 7 jours

---

## 🔴 TEST 4 : Bannissement Permanent

### Action : Bannir un utilisateur définitivement

**Requête** :
```http
POST http://localhost:3000/moderation/action
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "userId": "303eba33-934e-490f-9206-6f706b93ff4a",
  "action": "PERMANENT_BAN",
  "reason": "Spam répété et activités malveillantes",
  "severity": "CRITICAL",
  "notes": "Utilisateur bloqué définitivement après plusieurs avertissements"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/moderation/action ^
  -H "Authorization: Bearer <ADMIN_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"303eba33-934e-490f-9206-6f706b93ff4a\",\"action\":\"PERMANENT_BAN\",\"reason\":\"Spam répété\",\"severity\":\"CRITICAL\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Action de modération \"PERMANENT_BAN\" appliquée avec succès",
  "actionId": "action-uuid-here"
}
```

### ✅ Vérifications
- [ ] Status 201 Created
- [ ] Utilisateur banni définitivement
- [ ] Ne peut plus se connecter

---

## 📝 TEST 5 : Ajouter un Avertissement Simple

### Endpoint Simplifié pour Avertissements

**Requête** :
```http
POST http://localhost:3000/moderation/warning
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "userId": "303eba33-934e-490f-9206-6f706b93ff4a",
  "reason": "Langage inapproprié",
  "severity": "MINOR",
  "message": "Merci de respecter la charte de bonne conduite"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/moderation/warning ^
  -H "Authorization: Bearer <ADMIN_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"303eba33-934e-490f-9206-6f706b93ff4a\",\"reason\":\"Langage inapproprié\",\"severity\":\"MINOR\",\"message\":\"Merci de respecter la charte\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Avertissement ajouté avec succès",
  "warningId": "warning-uuid-here"
}
```

---

## 📊 TEST 6 : Historique de Modération d'un Utilisateur

### Consulter toutes les actions appliquées à un utilisateur

**Requête** :
```http
GET http://localhost:3000/moderation/user/303eba33-934e-490f-9206-6f706b93ff4a/history
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

**Curl** :
```bash
curl -X GET http://localhost:3000/moderation/user/303eba33-934e-490f-9206-6f706b93ff4a/history ^
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Réponse Attendue** :
```json
{
  "moderationActions": [
    {
      "id": "action-1",
      "action": "WARNING",
      "reason": "Comportement inapproprié",
      "severity": "MINOR",
      "createdAt": "2025-10-06T10:30:00.000Z",
      "moderator": {
        "id": "admin-id",
        "name": "Administrateur Principal"
      }
    },
    {
      "id": "action-2",
      "action": "TEMPORARY_SUSPENSION",
      "reason": "Violation des règles",
      "severity": "MODERATE",
      "duration": 7,
      "createdAt": "2025-10-06T11:00:00.000Z"
    }
  ],
  "warnings": [
    {
      "id": "warning-1",
      "reason": "Langage inapproprié",
      "severity": "MINOR",
      "message": "Merci de respecter la charte",
      "createdAt": "2025-10-06T09:00:00.000Z"
    }
  ],
  "currentStatus": "SUSPENDED"
}
```

### ✅ Vérifications
- [ ] Status 200 OK
- [ ] Liste des actions de modération
- [ ] Liste des avertissements
- [ ] Statut actuel de l'utilisateur

---

## 📋 TEST 7 : Lister les Utilisateurs Modérés

### Obtenir la liste avec filtres et pagination

**Requête avec filtres** :
```http
GET http://localhost:3000/moderation/users?status=SUSPENDED&action=TEMPORARY_SUSPENSION&page=1&limit=10
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

**Curl** :
```bash
curl -X GET "http://localhost:3000/moderation/users?status=SUSPENDED&page=1&limit=10" ^
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Réponse Attendue** :
```json
{
  "users": [
    {
      "id": "user-1",
      "email": "usertest@example.com",
      "name": "User Test",
      "status": "SUSPENDED",
      "lastAction": {
        "action": "TEMPORARY_SUSPENSION",
        "reason": "Violation des règles",
        "createdAt": "2025-10-06T11:00:00.000Z"
      },
      "totalWarnings": 2,
      "totalActions": 3
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### 📊 Paramètres de Filtrage

**Query Parameters** :
- `status` - Filtrer par statut (ACTIVE, SUSPENDED, BANNED)
- `action` - Filtrer par type d'action
- `page` - Numéro de page (défaut: 1)
- `limit` - Résultats par page (défaut: 20)

---

## 🔄 TEST 8 : Révoquer une Action de Modération

### Annuler une action précédente

**Requête** :
```http
PUT http://localhost:3000/moderation/action/action-uuid-here/revoke
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{
  "reason": "Décision révoquée après révision du cas"
}
```

**Curl** :
```bash
curl -X PUT http://localhost:3000/moderation/action/<ACTION_ID>/revoke ^
  -H "Authorization: Bearer <ADMIN_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"reason\":\"Décision révoquée après révision\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Action de modération révoquée avec succès"
}
```

### ✅ Vérifications
- [ ] Status 200 OK
- [ ] Action révoquée dans la DB
- [ ] Utilisateur restauré si applicable

---

## 📈 TEST 9 : Statistiques de Modération

### Dashboard Admin - Statistiques globales

**Requête** :
```http
GET http://localhost:3000/moderation/stats
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

**Curl** :
```bash
curl -X GET http://localhost:3000/moderation/stats ^
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Réponse Attendue** :
```json
{
  "totalActions": 156,
  "activeWarnings": 23,
  "bannedUsers": 12,
  "suspendedUsers": 8,
  "actionsThisMonth": 45,
  "topReasons": [
    {
      "reason": "Spam",
      "count": 34
    },
    {
      "reason": "Comportement inapproprié",
      "count": 28
    },
    {
      "reason": "Violation des règles",
      "count": 19
    }
  ]
}
```

### ✅ Vérifications
- [ ] Status 200 OK
- [ ] Statistiques complètes
- [ ] Top raisons de modération

---

## 👤 TEST 10 : Mes Avertissements (Utilisateur)

### Un utilisateur consulte ses propres avertissements

**Requête** :
```http
GET http://localhost:3000/moderation/my-warnings
Authorization: Bearer <USER_ACCESS_TOKEN>
```

**Curl** :
```bash
curl -X GET http://localhost:3000/moderation/my-warnings ^
  -H "Authorization: Bearer <USER_TOKEN>"
```

**Réponse Attendue** :
```json
{
  "warnings": [
    {
      "id": "warning-1",
      "reason": "Langage inapproprié",
      "severity": "MINOR",
      "message": "Merci de respecter la charte de bonne conduite",
      "createdAt": "2025-10-06T09:00:00.000Z",
      "isRead": false
    },
    {
      "id": "warning-2",
      "reason": "Comportement inapproprié",
      "severity": "MODERATE",
      "message": "Dernier avertissement avant suspension",
      "createdAt": "2025-10-06T10:30:00.000Z",
      "isRead": false
    }
  ],
  "unreadCount": 2
}
```

### ✅ Vérifications
- [ ] Status 200 OK
- [ ] Liste des avertissements de l'utilisateur
- [ ] Nombre d'avertissements non lus

---

## ✅ TEST 11 : Marquer les Avertissements comme Lus

### Utilisateur marque ses avertissements comme lus

**Requête** :
```http
PUT http://localhost:3000/moderation/my-warnings/read
Authorization: Bearer <USER_ACCESS_TOKEN>
```

**Curl** :
```bash
curl -X PUT http://localhost:3000/moderation/my-warnings/read ^
  -H "Authorization: Bearer <USER_TOKEN>"
```

**Réponse Attendue** :
```json
{
  "message": "Avertissements marqués comme lus"
}
```

### ✅ Vérifications
- [ ] Status 200 OK
- [ ] Avertissements marqués comme lus
- [ ] `unreadCount` passe à 0

---

## 🔒 TEST 12 : Sécurité - Utilisateur Normal Tente de Modérer

### Vérifier que les utilisateurs normaux ne peuvent pas modérer

**Requête** (avec token USER normal) :
```http
POST http://localhost:3000/moderation/action
Authorization: Bearer <USER_ACCESS_TOKEN>
Content-Type: application/json

{
  "userId": "another-user-id",
  "action": "WARNING",
  "reason": "Test",
  "severity": "MINOR"
}
```

**Curl** :
```bash
curl -X POST http://localhost:3000/moderation/action ^
  -H "Authorization: Bearer <USER_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"test\",\"action\":\"WARNING\",\"reason\":\"Test\",\"severity\":\"MINOR\"}"
```

**Réponse Attendue** :
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Accès refusé - Permissions insuffisantes"
}
```

### ✅ Vérifications
- [ ] Status 403 Forbidden
- [ ] Utilisateur normal bloqué
- [ ] Seuls ADMIN/MODERATOR peuvent modérer

---

## 📊 Scénarios de Test Complets

### Scénario 1 : Processus d'Avertissement Complet

1. ✅ TEST 1 - Connexion Admin
2. ✅ TEST 0 - Créer utilisateur test
3. ✅ TEST 2 - Donner 1er avertissement (MINOR)
4. ✅ TEST 5 - Donner 2ème avertissement (MODERATE)
5. ✅ TEST 6 - Vérifier historique utilisateur
6. ✅ TEST 10 - User consulte ses avertissements

**Résultat** : Utilisateur averti 2 fois, peut consulter ses avertissements.

---

### Scénario 2 : Escalade de Modération

1. ✅ TEST 2 - Avertissement MINOR
2. ⏳ Attendre (simuler récidive)
3. ✅ TEST 2 - Avertissement MODERATE
4. ⏳ Attendre (nouvelle récidive)
5. ✅ TEST 3 - Suspension temporaire 7 jours
6. ⏳ Attendre (récidive après suspension)
7. ✅ TEST 4 - Bannissement permanent

**Résultat** : Escalade complète jusqu'au ban.

---

### Scénario 3 : Gestion Dashboard Admin

1. ✅ TEST 1 - Connexion Admin
2. ✅ TEST 9 - Consulter statistiques globales
3. ✅ TEST 7 - Lister utilisateurs suspendus
4. ✅ TEST 6 - Voir historique d'un utilisateur
5. ✅ TEST 8 - Révoquer une action si erreur

**Résultat** : Admin peut surveiller et gérer toute la modération.

---

### Scénario 4 : Expérience Utilisateur Modéré

1. ✅ TEST 0 - Inscription utilisateur
2. ✅ Login utilisateur
3. ✅ Admin applique avertissement
4. ✅ TEST 10 - User consulte ses avertissements (2 non lus)
5. ✅ TEST 11 - User marque comme lus
6. ✅ TEST 10 - Vérifier `unreadCount` = 0

**Résultat** : Utilisateur informé de ses avertissements.

---

## 📝 Checklist Complète

### ✅ Actions de Modération

- [ ] **TEST 2** - WARNING fonctionne
- [ ] **TEST 3** - TEMPORARY_SUSPENSION fonctionne
- [ ] **TEST 4** - PERMANENT_BAN fonctionne
- [ ] **TEST 5** - Avertissement simple fonctionne
- [ ] Actions enregistrées dans DB
- [ ] Modérateur identifié pour chaque action

### ✅ Consultation & Historique

- [ ] **TEST 6** - Historique utilisateur complet
- [ ] **TEST 7** - Liste utilisateurs avec filtres
- [ ] **TEST 9** - Statistiques globales précises
- [ ] Pagination fonctionne
- [ ] Filtres par status/action fonctionnent

### ✅ Gestion des Actions

- [ ] **TEST 8** - Révocation d'action fonctionne
- [ ] Raison de révocation enregistrée
- [ ] Utilisateur restauré si applicable

### ✅ Expérience Utilisateur

- [ ] **TEST 10** - User voit ses avertissements
- [ ] **TEST 11** - Marquage comme lu fonctionne
- [ ] Notifications reçues (si implémenté)
- [ ] Messages clairs et informatifs

### ✅ Sécurité & Permissions

- [ ] **TEST 12** - Utilisateurs normaux bloqués (403)
- [ ] Seuls ADMIN/MODERATOR peuvent modérer
- [ ] Tokens vérifiés pour toutes les routes
- [ ] AdminGuard fonctionne correctement

---

## 🐛 Erreurs Courantes

### 403 Forbidden
**Cause** : Token utilisateur normal tente d'accéder aux routes admin

**Solution** :
- Utiliser token avec role ADMIN ou MODERATOR
- Se connecter avec admin@tajdeed.com

### 404 Not Found (Action/User)
**Cause** : ID invalide

**Solution** :
- Vérifier l'UUID de l'utilisateur
- Vérifier l'UUID de l'action
- Utiliser les bons IDs retournés par les tests précédents

### 400 Bad Request
**Cause** : Validation échouée

**Solution** :
- Vérifier que `userId` est fourni
- Vérifier que `action` est valide (WARNING, TEMPORARY_SUSPENSION, etc.)
- Vérifier que `severity` est valide (MINOR, MODERATE, SEVERE, CRITICAL)
- Pour TEMPORARY_SUSPENSION, fournir `duration` en jours

### 401 Unauthorized
**Cause** : Token manquant ou expiré

**Solution** :
- Vérifier header `Authorization: Bearer <token>`
- Refaire TEST 1 pour obtenir nouveau token
- Utiliser refresh token si expiré

---

## 📊 Types d'Actions et Leurs Effets

| Action | Effet | Durée | Réversible |
|--------|-------|-------|------------|
| **WARNING** | Avertissement simple | N/A | Oui (révocation) |
| **TEMPORARY_SUSPENSION** | Suspension temporaire | Définie (jours) | Oui (révocation ou expiration) |
| **PERMANENT_BAN** | Bannissement définitif | Permanente | Oui (révocation manuelle) |
| **CONTENT_REMOVAL** | Suppression de contenu | N/A | Non (contenu supprimé) |
| **ACCOUNT_RESTRICTION** | Restrictions sur le compte | Définie ou permanente | Oui (révocation) |

---

## 🎯 Niveaux de Sévérité

| Niveau | Usage | Exemples |
|--------|-------|----------|
| **MINOR** | Infractions légères | Langage inapproprié occasionnel |
| **MODERATE** | Infractions répétées | Violations répétées des règles |
| **SEVERE** | Infractions graves | Harcèlement, spam intensif |
| **CRITICAL** | Infractions très graves | Activités malveillantes, fraude |

---

## 🚀 Utilisation en Production

### Bonnes Pratiques

1. **Toujours documenter** : Fournir raison claire pour chaque action
2. **Escalade progressive** : WARNING → SUSPENSION → BAN
3. **Révision régulière** : Consulter statistiques et historiques
4. **Communication** : Informer les utilisateurs de leurs avertissements
5. **Appel possible** : Permettre aux utilisateurs de contester

### Recommandations

- Changer le mot de passe admin `MYK@123` en production
- Mettre en place un système de notifications email
- Logger toutes les actions de modération
- Créer des rôles MODERATOR avec permissions limitées
- Auditer régulièrement les actions des modérateurs

---

**Dernière mise à jour** : 6 octobre 2025  
**Version** : 2.0.0  
**Maintenu par** : Équipe Tajdeed
