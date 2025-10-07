# 👑 Guide des Fonctionnalités d'Administration et Google OAuth

## 📅 Date : 6 octobre 2025
## 🔖 Version : v2.1.0

---

## 📋 Résumé des Ajouts

### ✅ Fonctionnalités Implémentées

1. **🌐 Authentification Google OAuth**
   - Initialisation OAuth
   - Callback OAuth
   - Connexion POST alternative

2. **👑 Gestion des Administrateurs**
   - Création d'administrateurs (MODERATOR, ADMIN, SUPER_ADMIN)
   - Liste des administrateurs avec filtre par rôle
   - Modification du rôle d'un utilisateur
   - Suppression d'administrateur (rétrogradation)
   - Statistiques utilisateurs
   - Liste des utilisateurs avec filtres et pagination
   - Suspension d'utilisateur
   - Réactivation d'utilisateur

---

## 🔐 Configuration Requise

### Variables d'Environnement

Ajoutez ces variables à votre fichier `.env` :

```env
# Google OAuth
GOOGLE_CLIENT_ID="votre-client-id-google"
GOOGLE_CLIENT_SECRET="votre-secret-client-google"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"
```

### Obtenir les Credentials Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un existant
3. Activez l'API Google+ 
4. Créez des identifiants OAuth 2.0
5. Ajoutez `http://localhost:3000/auth/google/callback` dans les URIs de redirection autorisées

---

## 🌐 Endpoints Google OAuth

### 1. Initialiser OAuth

**GET** `/auth/google`

**Réponse :**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Redirigez l'utilisateur vers cette URL pour se connecter avec Google"
}
```

**Usage :**
```bash
curl http://localhost:3000/auth/google
```

### 2. Callback OAuth

**GET** `/auth/google/callback?code=XXX`

**Paramètres Query :**
- `code` (string, requis) : Code d'autorisation Google
- `state` (string, optionnel) : État pour CSRF protection

**Réponse :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

### 3. Connexion POST Alternative

**POST** `/auth/google`

**Body :**
```json
{
  "code": "4/0AY0e-g...",
  "state": "optional-state"
}
```

**Réponse :** Identique au callback

---

## 👑 Endpoints de Gestion des Admins

### Permissions Requises

| Endpoint | Rôle Minimum | Notes |
|----------|--------------|-------|
| Créer Admin | ADMIN | SUPER_ADMIN requis pour créer un autre SUPER_ADMIN |
| Lister Admins | ADMIN | - |
| Modifier Rôle | ADMIN | SUPER_ADMIN requis pour modifier un SUPER_ADMIN |
| Supprimer Admin | SUPER_ADMIN | Uniquement |
| Stats Utilisateurs | ADMIN | - |
| Lister Utilisateurs | ADMIN | - |
| Suspendre Utilisateur | ADMIN | Impossible de suspendre un admin |
| Activer Utilisateur | ADMIN | - |

---

### 1. Créer un Administrateur

**POST** `/auth/admin/create`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Body :**
```json
{
  "email": "moderator@tajdeed.com",
  "password": "SecureP@ssw0rd",
  "name": "Ahmed Moderator",
  "role": "MODERATOR"
}
```

**Rôles Disponibles :**
- `MODERATOR` : Modérateur
- `ADMIN` : Administrateur
- `SUPER_ADMIN` : Super Administrateur

**Réponse :**
```json
{
  "message": "Administrateur MODERATOR créé avec succès",
  "admin": {
    "id": "uuid",
    "email": "moderator@tajdeed.com",
    "name": "Ahmed Moderator",
    "role": "MODERATOR"
  }
}
```

**Exemple curl :**
```bash
curl -X POST http://localhost:3000/auth/admin/create \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"moderator@tajdeed.com\",\"password\":\"SecureP@ssw0rd\",\"name\":\"Ahmed Moderator\",\"role\":\"MODERATOR\"}"
```

---

### 2. Lister les Administrateurs

**GET** `/auth/admin/list?role=ADMIN`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Paramètres Query (optionnels) :**
- `role` : Filtrer par rôle (MODERATOR, ADMIN, SUPER_ADMIN)

**Réponse :**
```json
{
  "total": 3,
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
      "name": "Ahmed Moderator",
      "role": "MODERATOR",
      "status": "ACTIVE",
      "createdAt": "2025-10-06T14:30:00.000Z"
    }
  ]
}
```

**Exemple curl :**
```bash
curl http://localhost:3000/auth/admin/list?role=ADMIN \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 3. Modifier le Rôle d'un Utilisateur

**PUT** `/auth/admin/user/:userId/role`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Body :**
```json
{
  "role": "MODERATOR"
}
```

**Réponse :**
```json
{
  "message": "Rôle mis à jour avec succès",
  "user": {
    "id": "uuid",
    "email": "user@tajdeed.com",
    "name": "User Name",
    "role": "MODERATOR"
  }
}
```

**Exemple curl :**
```bash
curl -X PUT http://localhost:3000/auth/admin/user/USER_UUID/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"MODERATOR\"}"
```

---

### 4. Supprimer un Administrateur

**DELETE** `/auth/admin/:userId`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Note :** Nécessite le rôle **SUPER_ADMIN**

**Réponse :**
```json
{
  "message": "Administrateur rétrogradé en utilisateur standard",
  "userId": "uuid"
}
```

**Exemple curl :**
```bash
curl -X DELETE http://localhost:3000/auth/admin/USER_UUID \
  -H "Authorization: Bearer YOUR_SUPERADMIN_TOKEN"
```

---

### 5. Obtenir les Statistiques

**GET** `/auth/admin/stats`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "total": 150,
  "active": 142,
  "suspended": 8,
  "byRole": {
    "USER": 145,
    "MODERATOR": 3,
    "ADMIN": 1,
    "SUPER_ADMIN": 1
  }
}
```

**Exemple curl :**
```bash
curl http://localhost:3000/auth/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 6. Lister les Utilisateurs

**GET** `/auth/admin/users?role=USER&status=ACTIVE&page=1&limit=20`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Paramètres Query (tous optionnels) :**
- `role` : Filtrer par rôle (USER, MODERATOR, ADMIN, SUPER_ADMIN)
- `status` : Filtrer par statut (ACTIVE, SUSPENDED, BANNED, etc.)
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre de résultats par page (défaut: 20)

**Réponse :**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "status": "ACTIVE",
      "emailVerified": true,
      "createdAt": "2025-10-01T10:00:00.000Z",
      "updatedAt": "2025-10-06T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 145,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

**Exemple curl :**
```bash
curl "http://localhost:3000/auth/admin/users?role=USER&status=ACTIVE&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 7. Suspendre un Utilisateur

**PUT** `/auth/admin/user/:userId/suspend`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Body :**
```json
{
  "reason": "Violation des règles de la communauté",
  "duration": 168
}
```

**Champs :**
- `reason` (string, requis) : Raison de la suspension
- `duration` (number, optionnel) : Durée en heures (optionnel = permanent)

**Réponse :**
```json
{
  "message": "Utilisateur suspendu avec succès",
  "userId": "uuid",
  "reason": "Violation des règles de la communauté",
  "duration": 168
}
```

**Exemple curl :**
```bash
curl -X PUT http://localhost:3000/auth/admin/user/USER_UUID/suspend \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"Violation des règles\",\"duration\":168}"
```

---

### 8. Réactiver un Utilisateur

**PUT** `/auth/admin/user/:userId/activate`

**Headers :**
```
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "message": "Utilisateur réactivé avec succès",
  "userId": "uuid"
}
```

**Exemple curl :**
```bash
curl -X PUT http://localhost:3000/auth/admin/user/USER_UUID/activate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔒 Règles de Sécurité

### Hiérarchie des Rôles

```
SUPER_ADMIN (niveau 4)
    ↓
  ADMIN (niveau 3)
    ↓
MODERATOR (niveau 2)
    ↓
  USER (niveau 1)
```

### Restrictions

1. **Création d'Admin :**
   - ADMIN peut créer : MODERATOR, ADMIN
   - SUPER_ADMIN peut créer : MODERATOR, ADMIN, SUPER_ADMIN

2. **Modification de Rôle :**
   - ADMIN peut modifier : USER → MODERATOR, MODERATOR → USER, etc.
   - ADMIN **ne peut pas** modifier un SUPER_ADMIN
   - SUPER_ADMIN peut tout modifier

3. **Suppression d'Admin :**
   - Seul SUPER_ADMIN peut supprimer un admin
   - La suppression rétrograde en USER (ne supprime pas le compte)

4. **Suspension :**
   - Impossible de suspendre un MODERATOR, ADMIN ou SUPER_ADMIN
   - Seuls les USER peuvent être suspendus
   - La suspension supprime toutes les sessions actives

---

## 🧪 Tests Manuels

### Test 1 : Créer un Admin

```bash
# 1. Se connecter avec admin existant
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@tajdeed.com\",\"password\":\"MYK@123\"}"

# 2. Récupérer le accessToken de la réponse

# 3. Créer un nouveau modérateur
curl -X POST http://localhost:3000/auth/admin/create \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mod@tajdeed.com\",\"password\":\"Mod@123\",\"name\":\"Moderateur Test\",\"role\":\"MODERATOR\"}"
```

### Test 2 : Suspendre un Utilisateur

```bash
# 1. Créer un utilisateur test
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"baduser@test.com\",\"password\":\"Test@123\",\"name\":\"Bad User\"}"

# 2. Vérifier l'email (récupérer le code dans les logs)
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"baduser@test.com\",\"code\":\"123456\"}"

# 3. Se connecter en tant qu'admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@tajdeed.com\",\"password\":\"MYK@123\"}"

# 4. Suspendre l'utilisateur
curl -X PUT http://localhost:3000/auth/admin/user/USER_ID/suspend \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"Test de suspension\",\"duration\":24}"
```

### Test 3 : Google OAuth (Frontend)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Google OAuth</title>
</head>
<body>
  <h1>Test Google OAuth</h1>
  <button onclick="loginWithGoogle()">Se connecter avec Google</button>
  
  <script>
    async function loginWithGoogle() {
      // 1. Récupérer l'URL OAuth
      const response = await fetch('http://localhost:3000/auth/google');
      const data = await response.json();
      
      // 2. Rediriger vers Google
      window.location.href = data.url;
    }
    
    // 3. Après le callback, récupérer le code de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // 4. Envoyer le code au backend
      fetch('http://localhost:3000/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        console.log('Connecté:', data);
        localStorage.setItem('accessToken', data.accessToken);
      });
    }
  </script>
</body>
</html>
```

---

## 📊 Codes d'Erreur

| Code | Message | Cause |
|------|---------|-------|
| 400 | GOOGLE_CLIENT_ID non configuré | Variables d'env manquantes |
| 400 | Seul un SUPER_ADMIN peut créer un autre SUPER_ADMIN | Permission insuffisante |
| 400 | Impossible de suspendre un administrateur | Tentative de suspendre un admin |
| 401 | Échec de l'authentification Google | Code OAuth invalide |
| 403 | Seuls les SUPER_ADMIN peuvent supprimer des admins | Permission insuffisante |
| 404 | Utilisateur non trouvé | ID utilisateur invalide |
| 409 | Un utilisateur avec cet email existe déjà | Email déjà utilisé |

---

## 📝 Changelog

### v2.1.0 (6 octobre 2025)

**Ajouté :**
- ✅ Authentification Google OAuth
- ✅ Création d'administrateurs
- ✅ Gestion des rôles utilisateurs
- ✅ Statistiques utilisateurs
- ✅ Suspension/Activation d'utilisateurs
- ✅ Liste des utilisateurs avec filtres et pagination

**DTOs Ajoutés :**
- `GoogleAuthDto`
- `CreateAdminDto`
- `UpdateUserRoleDto`
- `SuspendUserDto`

**Méthodes Service Ajoutées :**
- `getGoogleAuthUrl()`
- `signInGoogle(code)`
- `createAdmin(dto, creatorRole)`
- `listAdmins(role?)`
- `updateUserRole(userId, role, adminRole)`
- `removeAdmin(userId)`
- `getUserStats()`
- `listUsers(filters)`
- `suspendUser(userId, reason, duration?)`
- `activateUser(userId)`

---

## 🚀 Prochaines Étapes

1. Configurer les variables d'environnement Google OAuth
2. Tester les endpoints d'administration
3. Créer une interface d'administration frontend
4. Implémenter des logs d'audit pour les actions admin
5. Ajouter des webhooks pour les événements admin

---

## 📚 Ressources

- [Documentation Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [Prisma Role-Based Access Control](https://www.prisma.io/docs/guides/database/advanced-database-tasks/role-based-access-control)

---

**Auteur :** GitHub Copilot  
**Date :** 6 octobre 2025  
**Version :** v2.1.0
