# 🔧 Guide de Démarrage Rapide - Tajdeed Backend

## ⚠️ IMPORTANT : Migration Better Auth

Si vous obtenez l'erreur `Argument 'type' is missing` lors de l'inscription, c'est que votre base de données utilise l'ancien schéma. Vous devez migrer vers le nouveau schéma Better Auth.

## 🚀 Installation et Configuration

### 1. Prérequis
- Node.js v16+ installé
- PostgreSQL en cours d'exécution
- yarn installé globalement (`npm install -g yarn`)

### 2. Installation

```bash
# Cloner le repository
cd tajdeed-backend-replit

# Installer les dépendances
yarn install
```

### 3. Configuration de l'Environnement

Créez un fichier `.env` à la racine du projet (copiez depuis `.env.example`) :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tajdeed?schema=public"

# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Migration de la Base de Données

**Option A : Migration Automatique (Recommandé)**
```bash
node scripts/migrate-better-auth.js
```

**Option B : Migration Manuelle**
```bash
# Générer le client Prisma
npx prisma generate

# Créer et appliquer la migration
npx prisma migrate dev --name update_better_auth_schema
```

**Option C : Reset Complet (Développement uniquement - ⚠️ PERD TOUTES LES DONNÉES)**
```bash
npx prisma migrate reset
```

### 5. Démarrer l'Application

```bash
yarn start
```

L'application démarrera sur `http://localhost:3000`

Vous devriez voir :
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [NestApplication] Nest application successfully started
🚀 Tajdeed MVP Backend is running on: http://0.0.0.0:3000
```

---

## 🐛 Résolution des Problèmes Courants

### Erreur: "Argument `type` is missing"

**Symptôme:**
```
Invalid `db[model].create()` invocation
Argument `type` is missing.
```

**Cause:** Votre base de données utilise l'ancien schéma incompatible avec Better Auth.

**Solution:**
```bash
# Exécutez la migration Better Auth
node scripts/migrate-better-auth.js

# Ou réinitialisez complètement (perd les données)
npx prisma migrate reset
```

---

### Erreur: "Can't reach database server"

**Symptôme:**
```
PrismaClientInitializationError: Can't reach database server at `localhost:5432`
```

**Solutions:**

1. **Vérifiez que PostgreSQL est en cours d'exécution**
   ```bash
   # Windows
   pg_ctl status -D "C:\Program Files\PostgreSQL\14\data"
   
   # Linux/Mac
   sudo service postgresql status
   ```

2. **Testez la connexion à la base de données**
   ```bash
   psql "postgresql://user:password@localhost:5432/tajdeed"
   ```

3. **Vérifiez votre DATABASE_URL dans `.env`**
   - Le format doit être : `postgresql://user:password@host:port/database?schema=public`
   - Remplacez `user`, `password`, `host`, `port`, `database` par vos valeurs

4. **Créez la base de données si elle n'existe pas**
   ```bash
   createdb tajdeed
   ```

---

### Erreur: "Module '@prisma/client' has no exported member"

**Symptôme:**
```
Module '"@prisma/client"' has no exported member 'User'
```

**Solution:**
```bash
# Régénérez le client Prisma
npx prisma generate

# Si ça ne fonctionne pas, nettoyez et réinstallez
rm -rf node_modules/.prisma
yarn install
npx prisma generate
```

---

### Erreur: "Cannot find module 'bcryptjs'"

**Solution:**
```bash
yarn add bcryptjs
yarn add -D @types/bcryptjs
```

---

### Warnings Better Auth "advanced.generateId is deprecated"

**Symptôme:**
```
WARN [Better Auth]: Your Better Auth config includes advanced.generateId which is deprecated
```

**Impact:** Aucun - c'est juste un avertissement. L'application fonctionne normalement.

**Solution (optionnelle):** Ce sera corrigé dans une future mise à jour de Better Auth.

---

## ✅ Vérification de l'Installation

### 1. Testez l'API de Santé

```bash
curl http://localhost:3000
```

Vous devriez voir la réponse du serveur.

### 2. Testez l'Inscription

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "username": "testuser"
  }'
```

**Réponse attendue (201 Created):**
```json
{
  "success": true,
  "message": "Inscription réussie ! Un email de vérification a été envoyé.",
  "requiresVerification": true
}
```

---

## 📚 Ressources Supplémentaires

- **Tests Manuels Complets:** Consultez `TESTS_MANUEL.md`
- **Collection Postman:** Importez `postman-collection.json`
- **Guide de Migration:** Consultez `MIGRATION_GUIDE.md`
- **Documentation Prisma:** https://www.prisma.io/docs
- **Documentation Better Auth:** https://www.better-auth.com

---

## 🆘 Besoin d'Aide ?

Si vous rencontrez d'autres problèmes :

1. Vérifiez les logs dans la console
2. Consultez `TESTS_MANUEL.md` pour des exemples de requêtes
3. Vérifiez que toutes les variables d'environnement sont correctement définies
4. Assurez-vous que la base de données est accessible

---

## 🎯 Prochaines Étapes

Une fois que tout fonctionne :

1. ✅ Testez l'inscription avec email/password
2. ✅ Vérifiez l'email de vérification (check les logs)
3. ✅ Testez la connexion
4. ✅ Testez les endpoints protégés avec le token
5. ✅ Explorez les fonctionnalités de modération

Bon développement ! 🚀
