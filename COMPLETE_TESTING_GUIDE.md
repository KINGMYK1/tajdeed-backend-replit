# 🧪 Guide Complet de Tests - Tajdeed Backend v2.1.0

**Date** : 6 octobre 2025  
**Version** : 2.1.0  
**Auteur** : GitHub Copilot

---

## 📋 Table des Matières

1. [Configuration Initiale](#-configuration-initiale)
2. [Tests Authentification](#-tests-authentification)
3. [Tests Google OAuth](#-tests-google-oauth)
4. [Tests Administration](#-tests-administration)
5. [Tests Modération](#-tests-modération)
6. [Tests Intégration E2E](#-tests-intégration-e2e)
7. [Checklist Validation](#-checklist-validation)

---

## 🔧 Configuration Initiale

### Prérequis

```bash
# 1. Démarrer le serveur
cd d:\Tajdeed\tajdeed-backend-replit
yarn start:dev

# 2. Vérifier que le serveur fonctionne
curl http://localhost:3000

# 3. Créer l'admin par défaut (si pas déjà fait)
npx ts-node scripts/create-admin.ts
```

### Variables de Test

```bash
# URL de base
BASE_URL="http://localhost:3000"

# Credentials admin par défaut
ADMIN_EMAIL="admin@tajdeed.com"
ADMIN_PASSWORD="MYK@123"

# Tokens (à récupérer après connexion)
ADMIN_TOKEN=""
USER_TOKEN=""
```

---

## 🔐 Tests Authentification

### TEST 1 : Inscription d'un Utilisateur

**Objectif** : Créer un nouveau compte utilisateur

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser@example.com\",\"password\":\"TestPass123!\",\"name\":\"Test User\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Inscription réussie. Un code de vérification à 6 chiffres a été envoyé à votre email.",
  "userId": "uuid-generated"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 201 (Created)
- [ ] Email reçu avec code à 6 chiffres
- [ ] Utilisateur créé en base (status: PENDING_VERIFICATION)
- [ ] Code expire dans 15 minutes

---

### TEST 2 : Vérification Email

**Objectif** : Vérifier l'email avec le code à 6 chiffres

```bash
# Récupérer le code depuis l'email ou les logs du serveur
# Exemple de code : 123456

curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser@example.com\",\"code\":\"123456\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Email vérifié avec succès",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "name": "Test User",
    "role": "USER"
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Access token JWT valide
- [ ] Refresh token UUID valide
- [ ] Utilisateur status = ACTIVE
- [ ] emailVerified = true
- [ ] Code de vérification marqué comme utilisé

**💾 Sauvegarder** :
```bash
# Copier le accessToken pour les tests suivants
USER_TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

---

### TEST 3 : Connexion Utilisateur

**Objectif** : Se connecter avec email/password

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser@example.com\",\"password\":\"TestPass123!\"}"
```

**Réponse Attendue** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "b2c3d4e5f6a7...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "name": "Test User",
    "role": "USER"
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Nouveaux tokens générés
- [ ] Session créée en base
- [ ] Session expire dans 30 jours

---

### TEST 4 : Récupérer Profil Utilisateur

**Objectif** : Obtenir les infos du compte connecté

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer USER_TOKEN"
```

**Réponse Attendue** :
```json
{
  "id": "uuid",
  "email": "testuser@example.com",
  "name": "Test User",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerified": true,
  "createdAt": "2025-10-06T10:00:00.000Z",
  "updatedAt": "2025-10-06T10:00:00.000Z"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Toutes les infos présentes
- [ ] Pas de données sensibles (password)

---

### TEST 5 : Rafraîchir Token

**Objectif** : Obtenir un nouveau access token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"b2c3d4e5f6a7...\"}"
```

**Réponse Attendue** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Nouveau access token généré
- [ ] Token différent du précédent
- [ ] Session toujours valide

---

### TEST 6 : Mot de Passe Oublié

**Objectif** : Demander un code de réinitialisation

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser@example.com\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Un code de réinitialisation a été envoyé à votre email"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Email reçu avec code PASSWORD_RESET
- [ ] Code expire dans 15 minutes

---

### TEST 7 : Réinitialiser Mot de Passe

**Objectif** : Changer le mot de passe avec le code

```bash
# Récupérer le code depuis l'email
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testuser@example.com\",\"code\":\"654321\",\"newPassword\":\"NewPass456!\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Mot de passe réinitialisé avec succès"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Mot de passe changé en base
- [ ] Ancien mot de passe ne fonctionne plus
- [ ] Nouveau mot de passe fonctionne
- [ ] Code marqué comme utilisé

---

### TEST 8 : Déconnexion

**Objectif** : Invalider la session

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer USER_TOKEN"
```

**Réponse Attendue** :
```json
{
  "message": "Déconnexion réussie"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Session supprimée en base
- [ ] Token ne fonctionne plus après logout

---

## 🌐 Tests Google OAuth

### TEST 9 : Initialiser OAuth Google

**Objectif** : Obtenir l'URL de connexion Google

```bash
curl -X GET http://localhost:3000/auth/google
```

**Réponse Attendue** :
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "message": "Redirigez l'utilisateur vers cette URL pour se connecter avec Google"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] URL Google valide
- [ ] client_id présent
- [ ] redirect_uri correct

---

### TEST 10 : Callback Google (Simulation)

**Note** : Ce test nécessite un vrai flow OAuth. Pour simuler :

1. **Obtenir un code Google** :
   - Ouvrir l'URL du TEST 9 dans un navigateur
   - Se connecter avec Google
   - Copier le paramètre `code` de l'URL de redirection

2. **Tester le callback** :

```bash
curl -X GET "http://localhost:3000/auth/google/callback?code=CODE_GOOGLE_ICI"
```

**Réponse Attendue** :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "c3d4e5f6a7b8...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "googleuser@gmail.com",
    "name": "Google User",
    "role": "USER"
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Utilisateur créé ou connecté
- [ ] emailVerified = true (Google vérifie l'email)
- [ ] Account Google lié en base
- [ ] Tokens JWT générés

---

### TEST 11 : Connexion Google POST

**Objectif** : Alternative POST pour le callback

```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"CODE_GOOGLE_ICI\"}"
```

**Réponse Attendue** : Identique au TEST 10

**✅ Vérifications** : Identiques au TEST 10

---

## 👑 Tests Administration

### Préparation : Connexion Admin

```bash
# Se connecter en tant qu'admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@tajdeed.com\",\"password\":\"MYK@123\"}"

# Copier le accessToken
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

---

### TEST 12 : Créer un Modérateur

**Objectif** : Créer un compte modérateur

```bash
curl -X POST http://localhost:3000/auth/admin/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"moderator@tajdeed.com\",\"password\":\"Mod123!\",\"name\":\"Moderator Test\",\"role\":\"MODERATOR\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Administrateur MODERATOR créé avec succès",
  "admin": {
    "id": "uuid",
    "email": "moderator@tajdeed.com",
    "name": "Moderator Test",
    "role": "MODERATOR"
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 201
- [ ] Modérateur créé
- [ ] emailVerified = true (auto)
- [ ] status = ACTIVE
- [ ] Peut se connecter immédiatement

---

### TEST 13 : Lister les Administrateurs

**Objectif** : Récupérer tous les admins

```bash
curl -X GET http://localhost:3000/auth/admin/list \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Réponse Attendue** :
```json
{
  "total": 2,
  "admins": [
    {
      "id": "uuid-1",
      "email": "admin@tajdeed.com",
      "name": "MYK",
      "role": "ADMIN",
      "status": "ACTIVE",
      "createdAt": "2025-10-01T10:00:00.000Z"
    },
    {
      "id": "uuid-2",
      "email": "moderator@tajdeed.com",
      "name": "Moderator Test",
      "role": "MODERATOR",
      "status": "ACTIVE",
      "createdAt": "2025-10-06T14:30:00.000Z"
    }
  ]
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Liste complète
- [ ] Filtre par rôle fonctionne

---

### TEST 14 : Modifier Rôle Utilisateur

**Objectif** : Promouvoir un USER en MODERATOR

```bash
# Récupérer l'ID de testuser@example.com depuis la base ou /admin/users

curl -X PUT http://localhost:3000/auth/admin/user/USER_ID/role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"MODERATOR\"}"
```

**Réponse Attendue** :
```json
{
  "message": "Rôle mis à jour avec succès",
  "user": {
    "id": "uuid",
    "email": "testuser@example.com",
    "name": "Test User",
    "role": "MODERATOR"
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Rôle changé en base
- [ ] Utilisateur a maintenant les permissions MODERATOR

---

### TEST 15 : Statistiques Utilisateurs

**Objectif** : Dashboard admin

```bash
curl -X GET http://localhost:3000/auth/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Réponse Attendue** :
```json
{
  "total": 3,
  "active": 3,
  "suspended": 0,
  "byRole": {
    "USER": 1,
    "MODERATOR": 1,
    "ADMIN": 1
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Compteurs corrects
- [ ] Tous les rôles présents

---

### TEST 16 : Lister Tous les Utilisateurs

**Objectif** : Liste paginée avec filtres

```bash
# Sans filtre (page 1, 20 résultats)
curl -X GET "http://localhost:3000/auth/admin/users" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Avec filtres
curl -X GET "http://localhost:3000/auth/admin/users?role=USER&status=ACTIVE&page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Réponse Attendue** :
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "USER",
      "status": "ACTIVE",
      "emailVerified": true,
      "createdAt": "2025-10-06T10:00:00.000Z",
      "updatedAt": "2025-10-06T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] Pagination fonctionne
- [ ] Filtres appliqués correctement
- [ ] Pas de passwords dans la réponse

---

### TEST 17 : Suspendre un Utilisateur

**Objectif** : Suspendre un compte USER

```bash
curl -X PUT http://localhost:3000/auth/admin/user/USER_ID/suspend \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"Violation des règles\",\"duration\":168}"
```

**Réponse Attendue** :
```json
{
  "message": "Utilisateur suspendu avec succès",
  "userId": "uuid",
  "reason": "Violation des règles",
  "duration": 168
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] status = SUSPENDED
- [ ] Sessions supprimées
- [ ] Utilisateur ne peut plus se connecter

---

### TEST 18 : Réactiver un Utilisateur

**Objectif** : Lever la suspension

```bash
curl -X PUT http://localhost:3000/auth/admin/user/USER_ID/activate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Réponse Attendue** :
```json
{
  "message": "Utilisateur réactivé avec succès",
  "userId": "uuid"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] status = ACTIVE
- [ ] Peut se reconnecter

---

### TEST 19 : Supprimer un Admin (SUPER_ADMIN)

**Note** : Nécessite un compte SUPER_ADMIN

```bash
# Créer un SUPER_ADMIN d'abord (modifier script/create-admin.ts)
# Puis se connecter et tester

curl -X DELETE http://localhost:3000/auth/admin/USER_ID \
  -H "Authorization: Bearer SUPERADMIN_TOKEN"
```

**Réponse Attendue** :
```json
{
  "message": "Administrateur rétrogradé en utilisateur standard",
  "userId": "uuid"
}
```

**✅ Vérifications** :
- [ ] Code HTTP 200
- [ ] role = USER
- [ ] Permissions perdues

---

## 👮 Tests Modération

Voir le guide complet : **[MODERATION_TESTING_GUIDE.md](./MODERATION_TESTING_GUIDE.md)**

**Résumé des tests** :
- [ ] TEST 20 : Action de modération (WARNING)
- [ ] TEST 21 : Suspension temporaire
- [ ] TEST 22 : Ban permanent
- [ ] TEST 23 : Historique utilisateur
- [ ] TEST 24 : Liste utilisateurs modérés
- [ ] TEST 25 : Révoquer action
- [ ] TEST 26 : Statistiques modération
- [ ] TEST 27 : Mes avertissements (USER)

---

## 🔗 Tests Intégration E2E

### SCÉNARIO 1 : Cycle de Vie Utilisateur Complet

```bash
# 1. Inscription
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e@test.com\",\"password\":\"E2E123!\",\"name\":\"E2E User\"}"

# 2. Vérifier email (copier code depuis logs)
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e@test.com\",\"code\":\"123456\"}"

# 3. Se déconnecter
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer TOKEN_FROM_STEP2"

# 4. Se reconnecter
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e@test.com\",\"password\":\"E2E123!\"}"

# 5. Récupérer profil
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN_FROM_STEP4"
```

**✅ Vérifications** :
- [ ] Toutes les étapes réussissent
- [ ] Tokens différents à chaque étape
- [ ] Données cohérentes
- [ ] Sessions correctement gérées

---

### SCÉNARIO 2 : Admin Crée Modérateur et Modère Utilisateur

```bash
# 1. Admin se connecte
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@tajdeed.com\",\"password\":\"MYK@123\"}"

# 2. Admin crée modérateur
curl -X POST http://localhost:3000/auth/admin/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mod@test.com\",\"password\":\"Mod123!\",\"name\":\"Mod E2E\",\"role\":\"MODERATOR\"}"

# 3. Modérateur se connecte
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mod@test.com\",\"password\":\"Mod123!\"}"

# 4. Modérateur suspend utilisateur
curl -X POST http://localhost:3000/moderation/action \
  -H "Authorization: Bearer MOD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"E2E_USER_ID\",\"action\":\"TEMPORARY_SUSPENSION\",\"reason\":\"Test E2E\",\"duration\":24}"

# 5. Admin vérifie les stats
curl -X GET http://localhost:3000/moderation/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**✅ Vérifications** :
- [ ] Hiérarchie des rôles respectée
- [ ] Modérateur peut modérer
- [ ] Actions enregistrées
- [ ] Stats mises à jour

---

### SCÉNARIO 3 : Google OAuth + Promotion Admin

```bash
# 1. Connexion via Google (voir TEST 10)
# ... obtenir le token Google

# 2. Admin liste utilisateurs pour trouver le compte Google
curl -X GET "http://localhost:3000/auth/admin/users?status=ACTIVE" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Admin promeut utilisateur Google en MODERATOR
curl -X PUT http://localhost:3000/auth/admin/user/GOOGLE_USER_ID/role \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"MODERATOR\"}"

# 4. Utilisateur Google se reconnecte et a les permissions
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer GOOGLE_USER_TOKEN"
```

**✅ Vérifications** :
- [ ] Compte Google créé correctement
- [ ] Promotion fonctionne
- [ ] Permissions actives immédiatement

---

## ✅ Checklist Validation Complète

### Authentification (9 endpoints)
- [ ] POST /auth/register
- [ ] POST /auth/verify-email
- [ ] POST /auth/resend-verification
- [ ] POST /auth/login
- [ ] GET /auth/me
- [ ] POST /auth/forgot-password
- [ ] POST /auth/reset-password
- [ ] POST /auth/refresh
- [ ] POST /auth/logout

### Google OAuth (3 endpoints)
- [ ] GET /auth/google
- [ ] GET /auth/google/callback
- [ ] POST /auth/google

### Administration (8 endpoints)
- [ ] POST /auth/admin/create
- [ ] GET /auth/admin/list
- [ ] PUT /auth/admin/user/:userId/role
- [ ] DELETE /auth/admin/:userId
- [ ] GET /auth/admin/stats
- [ ] GET /auth/admin/users
- [ ] PUT /auth/admin/user/:userId/suspend
- [ ] PUT /auth/admin/user/:userId/activate

### Modération (8 endpoints)
- [ ] POST /moderation/action
- [ ] POST /moderation/warning
- [ ] GET /moderation/user/:userId/history
- [ ] GET /moderation/users
- [ ] PUT /moderation/action/:actionId/revoke
- [ ] GET /moderation/stats
- [ ] GET /moderation/my-warnings
- [ ] PUT /moderation/my-warnings/read

### Sécurité
- [ ] Codes 6 chiffres expiration (15min)
- [ ] Access tokens expiration (15min)
- [ ] Refresh tokens expiration (30j)
- [ ] Sessions invalidées au logout
- [ ] Suspension bloque connexion
- [ ] Guards protègent les routes admin
- [ ] Hiérarchie rôles respectée
- [ ] SUPER_ADMIN seul peut supprimer admin
- [ ] Impossible suspendre un admin

### Performance
- [ ] Temps réponse < 200ms (routes simples)
- [ ] Temps réponse < 500ms (routes complexes)
- [ ] Pagination efficace (20 résultats/page)
- [ ] Pas de N+1 queries

### Base de Données
- [ ] User créé correctement
- [ ] Sessions persistées
- [ ] Codes vérification expirés nettoyés
- [ ] Actions modération enregistrées
- [ ] Relations correctes (FK)

---

## 📊 Rapport de Tests

### Template de Rapport

```markdown
# Rapport de Tests - Tajdeed Backend v2.1.0

**Date** : [DATE]  
**Testeur** : [NOM]  
**Environnement** : [dev/staging/prod]

## Résultats

### Authentification
- ✅ Inscription : OK
- ✅ Vérification : OK
- ✅ Connexion : OK
- ✅ Refresh : OK
- ✅ Logout : OK
- ✅ Reset password : OK

### Google OAuth
- ✅ Initialisation : OK
- ✅ Callback : OK
- ✅ Connexion POST : OK

### Administration
- ✅ Créer admin : OK
- ✅ Lister admins : OK
- ✅ Modifier rôle : OK
- ✅ Stats : OK
- ✅ Suspendre : OK
- ✅ Activer : OK

### Modération
- ✅ Action modération : OK
- ✅ Historique : OK
- ✅ Stats : OK

## Problèmes Rencontrés

[Liste des bugs trouvés]

## Recommandations

[Suggestions d'amélioration]
```

---

## 🚀 Automatisation

### Script Bash Complet

Créer `test-all.sh` :

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
ADMIN_EMAIL="admin@tajdeed.com"
ADMIN_PASSWORD="MYK@123"

echo "🧪 Tests Tajdeed Backend v2.1.0"
echo "================================"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction de test
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5
    
    echo -n "Testing $name... "
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    fi
    
    http_code="${response: -3}"
    
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        echo -e "${GREEN}✅ OK ($http_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL ($http_code)${NC}"
        return 1
    fi
}

# 1. Connexion admin
echo "📝 Connexion admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.accessToken')

if [ "$ADMIN_TOKEN" = "null" ]; then
    echo "❌ Échec connexion admin"
    exit 1
fi

echo "✅ Admin connecté"

# 2. Tests
test_endpoint "Stats admin" "GET" "/auth/admin/stats" "" "$ADMIN_TOKEN"
test_endpoint "Liste admins" "GET" "/auth/admin/list" "" "$ADMIN_TOKEN"
test_endpoint "Stats modération" "GET" "/moderation/stats" "" "$ADMIN_TOKEN"
test_endpoint "Google OAuth URL" "GET" "/auth/google" "" ""

echo ""
echo "================================"
echo "✅ Tests terminés"
```

---

## 📞 Support

Pour toute question ou problème :
- **Documentation** : README.md, ADMIN_MANAGEMENT_GUIDE.md
- **Tests Modération** : MODERATION_TESTING_GUIDE.md
- **Issues** : Créer une issue GitHub

---

**Fin du Guide Complet de Tests v2.1.0**
