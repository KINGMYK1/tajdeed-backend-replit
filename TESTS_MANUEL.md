# 📋 Guide de Tests Manuels - API Tajdeed

Ce guide vous explique comment tester manuellement tous les endpoints de l'API Tajdeed avec Postman ou Insomnia.

## 🚀 Configuration Initiale

### URL de Base
```
http://localhost:3000
```

### Headers Requis
Pour les endpoints protégés, ajoutez toujours :
```
Authorization: Bearer [VOTRE_TOKEN_ACCESS]
Content-Type: application/json
```

---

## 🔐 Tests d'Authentification

### 1. Connexion Google (Simulée)

**Endpoint:** `POST /auth/google`

**Description:** Simule une connexion Google OAuth (actuellement avec données factices)

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "code": "google_auth_code_exemple"
}
```

**Réponse Attendue (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000.1728000000000",
  "user": {
    "id": "google_1728000000000",
    "username": "test@example.com",
    "role": "USER"
  },
  "expiresIn": 900
}
```

**💡 Note:** Gardez le `accessToken` pour les tests suivants !

---

### 2. Callback Google OAuth

**Endpoint:** `GET /auth/google/callback?code=test_code&state=test_state`

**Description:** Point d'entrée du callback OAuth Google

**Query Parameters:**
- `code`: Code d'autorisation OAuth
- `state`: État de sécurité OAuth

**Exemple d'URL complète:**
```
http://localhost:3000/auth/google/callback?code=test_auth_code&state=random_state
```

**Réponse Attendue (200 OK):**
```json
{
  "message": "Authentification réussie",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000.1728000000000",
  "user": {
    "id": "google_1728000000000",
    "username": "test@example.com",
    "role": "USER"
  }
}
```

---

### 3. Renouvellement de Token

**Endpoint:** `POST /auth/refresh`

**Description:** Renouvelle un token d'accès expiré

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000.1728000000000"
}
```

**Réponse Attendue (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440001.1728000000001",
  "user": {
    "id": "google_1728000000000",
    "username": "test@example.com",
    "role": "USER"
  },
  "expiresIn": 900
}
```

**Erreurs Possibles:**
- `401 Unauthorized`: Token invalide ou expiré

---

## 🔒 Tests d'Endpoints Protégés

### 4. Profil Utilisateur

**Endpoint:** `GET /auth/me`

**Description:** Récupère les informations du profil utilisateur connecté

**Headers:**
```
Authorization: Bearer [VOTRE_ACCESS_TOKEN]
```

**Réponse Attendue (200 OK):**
```json
{
  "id": "google_1728000000000",
  "username": "test@example.com",
  "role": "USER",
  "createdAt": "2024-09-27T16:00:00.000Z",
  "updatedAt": "2024-09-27T16:00:00.000Z"
}
```

**Erreurs Possibles:**
- `401 Unauthorized`: Token manquant → `"Token d'accès manquant"`
- `401 Unauthorized`: Token invalide → `"Session invalide ou expirée"`

---

### 5. Déconnexion

**Endpoint:** `POST /auth/logout`

**Description:** Déconnecte l'utilisateur et invalide sa session

**Headers:**
```
Authorization: Bearer [VOTRE_ACCESS_TOKEN]
```

**Réponse Attendue (204 No Content):**
- Aucun contenu (déconnexion réussie)

**Erreurs Possibles:**
- `401 Unauthorized`: Token manquant ou invalide

---

## 🧪 Scénarios de Test Complets

### Scénario 1: Flux d'authentification complet

1. **Connexion** → `POST /auth/google`
2. **Vérification profil** → `GET /auth/me`
3. **Renouvellement token** → `POST /auth/refresh`
4. **Vérification profil avec nouveau token** → `GET /auth/me`
5. **Déconnexion** → `POST /auth/logout`
6. **Vérification échec accès** → `GET /auth/me` (doit échouer)

### Scénario 2: Tests d'erreurs

1. **Accès sans token** → `GET /auth/me` (doit retourner 401)
2. **Token invalide** → Modifier le token et appeler `GET /auth/me`
3. **Refresh token invalide** → `POST /auth/refresh` avec mauvais token

---

## 📝 Collection Postman

### Variables d'environnement à créer :

```
BASE_URL = http://localhost:3000
ACCESS_TOKEN = [sera mis à jour automatiquement]
REFRESH_TOKEN = [sera mis à jour automatiquement]
```

### Script Postman pour sauvegarder les tokens :

**Dans l'onglet "Tests" de la requête `POST /auth/google` :**

```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("ACCESS_TOKEN", response.accessToken);
    pm.environment.set("REFRESH_TOKEN", response.refreshToken);
}
```

---

## 🚨 Résolution des Problèmes

### Erreur 401 "Token d'accès manquant"
- Vérifiez que le header `Authorization: Bearer [token]` est présent
- Vérifiez qu'il n'y a pas d'espace supplémentaire

### Erreur 401 "Session invalide ou expirée"  
- Le token a expiré (15 minutes), utilisez le refresh token
- Le token est malformé, reconnectez-vous

### Erreur 500 (Erreur serveur)
- Vérifiez que le serveur backend est démarré
- Vérifiez la console serveur pour les logs d'erreur

### Pas de réponse / Timeout
- Vérifiez que l'URL est correcte : `http://localhost:3000`
- Vérifiez que le workflow "Backend Server" est en cours d'exécution

---

## 📊 Status Codes de Réponse

| Code | Signification | Exemples |
|------|---------------|----------|
| 200  | Succès        | Connexion, profil, refresh réussis |
| 204  | Succès sans contenu | Déconnexion réussie |
| 400  | Requête invalide | Code OAuth manquant |
| 401  | Non autorisé   | Token manquant/invalide |
| 500  | Erreur serveur | Problème base de données |

---

✅ **Vous êtes maintenant prêt à tester l'API Tajdeed !**

*N'hésitez pas à consulter les logs serveur si vous rencontrez des problèmes.*