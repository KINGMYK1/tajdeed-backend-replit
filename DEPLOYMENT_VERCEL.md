# 🚀 Guide de Déploiement Vercel - Tajdeed Backend

## 📋 Table des Matières
1. [Prérequis](#prérequis)
2. [Configuration Vercel](#configuration-vercel)
3. [Variables d'Environnement](#variables-denvironnement)
4. [Déploiement](#déploiement)
5. [Tests Post-Déploiement](#tests-post-déploiement)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prérequis

### 1. Compte Vercel
- Créer un compte sur [vercel.com](https://vercel.com)
- Installer Vercel CLI : `npm install -g vercel`

### 2. Base de Données
- ✅ Supabase configuré (déjà fait)
- ✅ DATABASE_URL prêt
- ✅ DIRECT_URL prêt

### 3. Providers OAuth/Email
- ✅ Google OAuth (CLIENT_ID + SECRET)
- ✅ Service Email (Mailtrap/Gmail)

---

## 🔧 Configuration Vercel

### Méthode 1 : Via Interface Web (Recommandé)

#### Étape 1 : Importer le Projet
1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Cliquer sur **"Import Git Repository"**
3. Connecter votre GitHub/GitLab/Bitbucket
4. Sélectionner le repo `tajdeed-backend-replit`

#### Étape 2 : Configuration du Build
```
Framework Preset: Other
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### Étape 3 : Variables d'Environnement
Ajouter toutes les variables (voir section suivante)

#### Étape 4 : Déployer
Cliquer sur **"Deploy"** et attendre 2-3 minutes

---

### Méthode 2 : Via CLI

```bash
# 1. Se connecter à Vercel
vercel login

# 2. Aller dans le dossier du projet
cd d:\Tajdeed\tajdeed-backend-replit

# 3. Déployer
vercel

# 4. Suivre les instructions :
# - Setup and deploy? Yes
# - Which scope? Votre compte
# - Link to existing project? No
# - What's your project's name? tajdeed-backend
# - In which directory is your code located? ./
# - Want to override settings? Yes
#   - Build Command: npm run build
#   - Output Directory: dist
#   - Development Command: npm run start:dev

# 5. Déployer en production
vercel --prod
```

---

## 🔐 Variables d'Environnement

### Configuration Vercel Dashboard

Aller dans : **Project Settings > Environment Variables**

#### 1. Base de Données (OBLIGATOIRE)

```env
DATABASE_URL
postgresql://postgres.ctpnjjmqnnwdforsuabg:MyK91@33837@aws-1-eu-west-3.pooler.supabase.com:5432/postgres

DIRECT_URL
postgresql://postgres.ctpnjjmqnnwdforsuabg:MyK91@33837@aws-1-eu-west-3.pooler.supabase.com:5432/postgres
```

#### 2. JWT & Sécurité (OBLIGATOIRE)

```env
JWT_SECRET
# Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Exemple : 8f3e9d2c1a4b5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0

BETTER_AUTH_SECRET
# Utiliser le même que JWT_SECRET ou en générer un nouveau

JWT_REFRESH_SECRET
# Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Google OAuth (OBLIGATOIRE)

```env
GOOGLE_CLIENT_ID
votre-client-id.apps.googleusercontent.com

GOOGLE_CLIENT_SECRET
GOCSPX-votre-secret

GOOGLE_REDIRECT_URI
https://votre-api.vercel.app/auth/google/callback
```

**⚠️ IMPORTANT** : Ajouter l'URL Vercel dans Google Console :
1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services > Credentials
3. Modifier votre OAuth Client
4. Ajouter dans "Authorized redirect URIs" :
   - `https://votre-api.vercel.app/auth/google/callback`

#### 4. Email Service (OBLIGATOIRE)

**Option A : Mailtrap (Development)**
```env
EMAIL_HOST
sandbox.smtp.mailtrap.io

EMAIL_PORT
587

EMAIL_USER
votre-username-mailtrap

EMAIL_PASSWORD
votre-password-mailtrap

EMAIL_FROM
noreply@tajdeed.com
```

**Option B : Gmail (Production Recommandé)**
```env
EMAIL_HOST
smtp.gmail.com

EMAIL_PORT
587

EMAIL_USER
votre-email@gmail.com

EMAIL_PASSWORD
# App Password Google (pas votre mot de passe Gmail)
# Générer sur : https://myaccount.google.com/apppasswords

EMAIL_FROM
noreply@tajdeed.com
```

#### 5. Application (OBLIGATOIRE)

```env
NODE_ENV
production

PORT
3000

FRONTEND_URL
https://votre-frontend.vercel.app
```

---

## 🚀 Déploiement

### Déploiement Initial

```bash
# Via CLI
vercel --prod

# Ou via Git (recommandé)
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

Vercel déploiera automatiquement à chaque push sur `main`.

### URLs Générées

Après déploiement, vous aurez :
- **Production** : `https://tajdeed-backend.vercel.app`
- **Preview** : `https://tajdeed-backend-xxx.vercel.app` (pour chaque commit)

---

## 🧪 Tests Post-Déploiement

### 1. Test de Santé

```bash
# Vérifier que l'API répond
curl https://votre-api.vercel.app/
```

**Réponse attendue** :
```json
{
  "message": "Tajdeed MVP Backend API",
  "version": "2.1.0",
  "status": "operational"
}
```

### 2. Test Authentification

```bash
# Test inscription
curl -X POST https://votre-api.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "name": "Test User"
  }'
```

### 3. Test Google OAuth

```bash
# Obtenir URL OAuth
curl https://votre-api.vercel.app/auth/google
```

### 4. Test avec Insomnia/Postman

1. Créer une collection
2. Base URL : `https://votre-api.vercel.app`
3. Tester les endpoints :
   - POST `/auth/register`
   - POST `/auth/login`
   - GET `/auth/me` (avec token)
   - POST `/auth/refresh`

### 5. Test CORS

```javascript
// Tester depuis le navigateur (Console)
fetch('https://votre-api.vercel.app/auth/me', {
  headers: {
    'Authorization': 'Bearer votre-token'
  }
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**✅ Devrait fonctionner depuis n'importe quelle origine**

---

## 🔍 Monitoring

### Logs Vercel

```bash
# Via CLI
vercel logs https://votre-api.vercel.app

# Ou via Dashboard
# https://vercel.com/your-username/tajdeed-backend/deployments
```

### Métriques Disponibles

Dans le Dashboard Vercel :
- **Functions** : Temps d'exécution
- **Bandwidth** : Trafic réseau
- **Invocations** : Nombre de requêtes
- **Errors** : Taux d'erreur

---

## ⚠️ Troubleshooting

### Problème 1 : Build Failed

**Erreur** : `Module not found: Can't resolve '@prisma/client'`

**Solution** :
```bash
# Ajouter dans vercel.json
{
  "build": {
    "env": {
      "PRISMA_GENERATE_SKIP_AUTOINSTALL": "false"
    }
  }
}
```

### Problème 2 : Database Connection Failed

**Erreur** : `P1001: Can't reach database server`

**Solution** :
1. Vérifier `DATABASE_URL` dans Vercel
2. Vérifier que Supabase accepte connexions externes
3. Utiliser l'URL de pooling (port 5432)

### Problème 3 : JWT Validation Failed

**Erreur** : `JWT malformed` ou `Invalid signature`

**Solution** :
1. Vérifier que `JWT_SECRET` est identique en local et prod
2. Générer nouveau token après déploiement
3. Vérifier `JWT_REFRESH_SECRET` aussi

### Problème 4 : CORS Error

**Erreur** : `Access-Control-Allow-Origin` missing

**Solution** :
✅ **Déjà réglé** : Le CORS accepte toutes les origines

Si problème persiste :
```typescript
// Vérifier dans src/main.ts
app.enableCors({
  origin: true, // Accepte tout
  credentials: true
});
```

### Problème 5 : Function Timeout

**Erreur** : `Function execution timeout exceeded`

**Solution** :
```json
// Dans vercel.json
{
  "functions": {
    "src/main.ts": {
      "maxDuration": 30
    }
  }
}
```

### Problème 6 : Email Not Sending

**Solution** :
1. Vérifier variables `EMAIL_*` dans Vercel
2. Si Gmail, vérifier App Password
3. Tester avec Mailtrap d'abord

### Problème 7 : Google OAuth Not Working

**Solution** :
1. Vérifier `GOOGLE_REDIRECT_URI` dans Vercel
2. Ajouter URL dans Google Console :
   - `https://votre-api.vercel.app/auth/google/callback`
3. Vérifier `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`

---

## 📊 Limites Vercel

### Plan Gratuit (Hobby)
- ✅ 100 GB Bandwidth / mois
- ✅ 100 GB-Hrs Function Execution
- ✅ 12000 Function Invocations / jour
- ✅ 1000 Deployments / mois
- ✅ Serverless Functions (10s timeout)

**C'est largement suffisant pour démarrer !**

### Recommendations Production

Si vous dépassez les limites :
1. **Passer au Plan Pro** (20$/mois)
   - 1 TB Bandwidth
   - 1000 GB-Hrs Execution
   - 60s Function Timeout

2. **Ou migrer vers** :
   - Railway.app (meilleur pour NestJS)
   - Render.com
   - Fly.io
   - AWS/GCP/Azure

---

## 🎯 Checklist de Déploiement

### Avant Déploiement
- [ ] Toutes les variables d'environnement copiées
- [ ] `JWT_SECRET` généré (nouveau, pas celui de dev)
- [ ] Google OAuth configuré avec nouvelle URL
- [ ] Email service configuré
- [ ] Database URL vérifié
- [ ] `.env.production` créé localement

### Après Déploiement
- [ ] Test endpoint santé : `curl https://api.vercel.app/`
- [ ] Test inscription
- [ ] Test connexion
- [ ] Test Google OAuth
- [ ] Test email (vérification)
- [ ] Test endpoints admin
- [ ] Test CORS depuis Insomnia
- [ ] Monitoring activé

---

## 🔗 Liens Utiles

- **Dashboard Vercel** : https://vercel.com/dashboard
- **Documentation Vercel** : https://vercel.com/docs
- **Supabase Dashboard** : https://app.supabase.com
- **Google Cloud Console** : https://console.cloud.google.com
- **Mailtrap** : https://mailtrap.io

---

## 🆘 Support

### Logs en Direct

```bash
# Suivre les logs
vercel logs --follow

# Logs d'une fonction spécifique
vercel logs --since 1h

# Logs d'erreur uniquement
vercel logs --level error
```

### Redéploiement

```bash
# Forcer un redéploiement
vercel --force

# Rollback vers déploiement précédent
vercel rollback [deployment-url]
```

---

## 📝 Commandes Rapides

```bash
# Déployer en production
vercel --prod

# Voir les déploiements
vercel ls

# Voir les logs
vercel logs

# Voir les variables env
vercel env ls

# Ajouter variable env
vercel env add JWT_SECRET

# Supprimer un déploiement
vercel rm [deployment-url]

# Lier projet local à Vercel
vercel link

# Ouvrir dashboard
vercel open
```

---

## 🎉 Après le Déploiement

### Partager l'API

Votre API est maintenant accessible publiquement :
- **Base URL** : `https://votre-api.vercel.app`
- **Docs** : Partagez le README.md
- **Collection Postman** : `test/Tajdeed_API_Collection.postman.json`

### Tester avec Insomnia

1. Créer nouvelle collection
2. Base URL : `https://votre-api.vercel.app`
3. Importer les endpoints du README
4. Tester depuis n'importe où (CORS activé ✅)

### Inviter des Testeurs

Ils peuvent tester directement avec :
- Insomnia
- Postman
- curl
- Navigateur (pour GET requests)

**Pas besoin de configuration CORS !** ✅

---

## 🔒 Sécurité Production

### À Faire Plus Tard (Optionnel)

Quand vous serez prêt à restreindre CORS :

```typescript
// src/main.ts
app.enableCors({
  origin: [
    'https://tajdeed.com',
    'https://www.tajdeed.com',
    'https://admin.tajdeed.com'
  ],
  credentials: true
});
```

**Pour l'instant, CORS ouvert = Parfait pour tests !** 🎯

---

**Généré le** : 7 octobre 2025  
**Version** : 1.0.0  
**Statut** : ✅ Production Ready
