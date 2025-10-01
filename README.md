# Tajdeed MVP Backend

A complete, production-ready NestJS TypeScript backend for "Tajdeed MVP" - a C2C marketplace (Vinted-like) with modular architecture, Better Auth integration, and comprehensive moderation system.

## ✨ Features

- **🔐 Authentication Complète**: 
  - Email/Mot de passe avec vérification email
  - OAuth Google (via Better Auth)
  - JWT tokens avec refresh tokens
  - Gestion de sessions sécurisée
  
- **👮 Système de Modération**:
  - Actions de modération (warnings, suspensions, bans)
  - Historique complet des actions
  - Système d'avertissements avec niveaux de gravité
  - Statistiques détaillées pour les modérateurs
  - Gestion des permissions par rôle (USER, MODERATOR, ADMIN, SUPER_ADMIN)

- **🏗️ Architecture Modulaire**: Séparation claire des responsabilités
- **🔒 Sécurité**: Helmet, rate limiting, validation des données
- **📊 Base de données**: Prisma ORM avec PostgreSQL
- **⚙️ Configuration**: Gestion par variables d'environnement
- **📝 TypeScript**: Mode strict pour la sécurité des types
- **✅ Tests**: Tests E2E complets avec Jest

## 📁 Structure du Projet

```
src/
├── app.module.ts          # Module principal
├── main.ts               # Point d'entrée
├── auth/                 # Module d'authentification
│   ├── auth.config.ts    # Configuration Better Auth
│   ├── auth.controller.ts # Routes d'authentification
│   ├── auth.service.ts   # Logique métier auth
│   ├── auth.guard.ts     # Guard JWT
│   ├── dto/              # DTOs de validation
│   └── interfaces/       # Interfaces TypeScript
├── moderation/           # Module de modération
│   ├── moderation.controller.ts
│   ├── moderation.service.ts
│   └── moderation.module.ts
├── common/               # Utilitaires partagés
│   ├── config.module.ts  # Configuration environnement
│   └── middlewares/      # Middlewares sécurité
└── prisma/               # Service base de données
    └── prisma.service.ts
prisma/
└── schema.prisma         # Schéma de la base de données
test/
├── auth.e2e-spec.ts      # Tests E2E authentification
└── moderation.e2e-spec.ts # Tests E2E modération
```

## 🗄️ Modèles de Base de Données

### Authentification
- **User**: Utilisateurs avec email, nom, rôle et statut
- **Account**: Comptes de connexion (email/password, OAuth)
- **Session**: Sessions actives avec tokens
- **VerificationToken**: Tokens de vérification email

### Modération
- **ModeratedUser**: Actions de modération (warnings, bans, suspensions)
- **UserWarning**: Avertissements avec niveaux de gravité

### Enums
- **Role**: USER, MODERATOR, ADMIN, SUPER_ADMIN
- **UserStatus**: ACTIVE, SUSPENDED, BANNED, PENDING_VERIFICATION
- **ModerationAction**: WARNING, TEMPORARY_SUSPENSION, PERMANENT_BAN, etc.
- **WarningSeverity**: LOW, MEDIUM, HIGH, CRITICAL

## Quick Setup

Follow these exact steps to get started:

```bash
npm install
cp .env.example .env
# Fill SUPABASE_URL in .env
npx prisma generate
npx prisma db push
npm run start:dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secret key for authentication
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (optional)

## 🔐 Authentication API

### Endpoints

#### POST /auth/google

Initialise l'authentification OAuth Google.

```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"code": "google_oauth_code_here"}'
```

**Response:**

```json
{
  "accessToken": "access_userId_timestamp",
  "refreshToken": "uuid.timestamp", 
  "user": {
    "id": "user_id",
    "username": "user@example.com",
    "role": "USER"
  },
  "expiresIn": 900
}
```

#### GET /auth/google/callback

Callback OAuth Google (automatique).

```bash
		curl "http://localhost:3000/auth/google/callback?code=google_code&state=optional_state"
```

#### POST /auth/refresh

Rafraîchit l'access token.

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

#### GET /auth/me

Récupère le profil utilisateur (protégé).

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer your_access_token"
```

#### POST /auth/logout

Déconnexion et révocation de session.

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer your_access_token"
```

### Security Features

- **Rate Limiting**:
  - Global: 100 requests/minute
  - Auth endpoints: 5 requests/15 minutes
- **JWT Validation**: AuthGuard protège les routes sensibles
- **Session Management**: Sessions persistantes avec refresh tokens (TTL 30 jours)
- **CORS**: Configuré pour développement/production

## Available Scripts

- `npm run start:dev` - Start development server
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema to database
- `npm run prisma:studio` - Open Prisma Studio
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## API Documentation

The server runs on `http://localhost:3000` by default.

## Security Features

- **Helmet**: Comprehensive security headers
- **Rate Limiting**: 100 requests per minute per IP
- **CORS**: Configured for development/production
- **Input Validation**: Global validation pipes

## Production Deployment

Build and deploy using Docker or standard Node.js deployment:

```bash
npm run build
npm run start:prod
```

---

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tajdeed?schema=public"

# Better Auth
BETTER_AUTH_SECRET="votre-secret-key-tres-securisee-32-chars-minimum"
BETTER_AUTH_URL="http://localhost:3000"

# Email (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="votre-email@gmail.com"
EMAIL_PASSWORD="votre-app-password"
EMAIL_FROM="noreply@tajdeed.com"

# Google OAuth
GOOGLE_CLIENT_ID="votre-google-client-id"
GOOGLE_CLIENT_SECRET="votre-google-client-secret"

# JWT
JWT_SECRET="votre-jwt-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
PORT=3000
```

### Configuration Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet
3. Activer Google+ API
4. Créer des identifiants OAuth 2.0
5. Ajouter les URIs de redirection autorisées :
   - `http://localhost:3000/auth/google/callback`
   - `https://votre-domaine.com/auth/google/callback` (production)

### Configuration Email

Pour Gmail, activez l'accès moins sécurisé ou utilisez un mot de passe d'application :

1. Aller dans votre compte Google
2. Sécurité → Validation en deux étapes (activer si nécessaire)
3. Mots de passe d'application → Générer un nouveau mot de passe
4. Utiliser ce mot de passe dans `EMAIL_PASSWORD`

---

## 📦 Installation

```bash
# Installer les dépendances
yarn install

# Générer le client Prisma
npx prisma generate

# Créer/migrer la base de données
npx prisma db push

# (Optionnel) Seed initial des données
npx prisma db seed
```

---

## 🚀 Démarrage de l'Application

```bash
# Mode développement (avec rechargement automatique)
yarn start:dev

# Mode développement simple
yarn start

# Mode production
yarn build
yarn start:prod
```

L'application sera accessible sur `http://localhost:3000`

---

## 🧪 Tests

### Tests Automatisés

```bash
# Tests unitaires
yarn test

# Tests E2E
yarn test:e2e

# Tests avec couverture
yarn test:cov

# Tests en mode watch
yarn test:watch
```

### Tests Manuels

Consultez le guide complet : **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)**

Ce guide contient :
- ✅ Tous les endpoints avec exemples de requêtes/réponses
- 📋 Scénarios de test complets
- 🔧 Configuration Postman/Insomnia
- 🐛 Conseils de débogage

---

## 📚 Documentation API

### Endpoints d'Authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `POST` | `/auth/register` | Inscription avec email/password | ❌ |
| `POST` | `/auth/login` | Connexion | ❌ |
| `POST` | `/auth/verify-email` | Vérifier l'email | ❌ |
| `POST` | `/auth/resend-verification` | Renvoyer l'email de vérification | ❌ |
| `POST` | `/auth/refresh` | Rafraîchir le token | ❌ |
| `GET` | `/auth/me` | Récupérer le profil | ✅ |
| `POST` | `/auth/logout` | Déconnexion | ✅ |
| `GET` | `/auth/google` | Authentification Google (OAuth) | ❌ |
| `GET` | `/auth/google/callback` | Callback Google OAuth | ❌ |

### Endpoints de Modération

| Méthode | Endpoint | Description | Rôle Requis |
|---------|----------|-------------|-------------|
| `POST` | `/moderation/action` | Créer une action de modération | MODERATOR/ADMIN |
| `POST` | `/moderation/warning` | Créer un avertissement | MODERATOR/ADMIN |
| `GET` | `/moderation/user/:id/history` | Historique d'un utilisateur | MODERATOR/ADMIN |
| `GET` | `/moderation/users` | Lister les utilisateurs modérés | MODERATOR/ADMIN |
| `PUT` | `/moderation/action/:id/revoke` | Révoquer une action | ADMIN |
| `GET` | `/moderation/stats` | Statistiques de modération | ADMIN |
| `GET` | `/moderation/my-warnings` | Mes avertissements | USER |
| `PUT` | `/moderation/my-warnings/read` | Marquer comme lu | USER |

Pour plus de détails avec exemples de requêtes/réponses, consultez [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)

---

## 🛠️ Outils de Développement

### Prisma Studio

Interface graphique pour gérer la base de données :

```bash
npx prisma studio
```

Accessible sur `http://localhost:5555`

### Migrations Prisma

```bash
# Créer une migration
npx prisma migrate dev --name nom_migration

# Appliquer les migrations en production
npx prisma migrate deploy

# Réinitialiser la base de données (DEV ONLY)
npx prisma migrate reset
```

### Génération du Client Prisma

Après chaque modification du `schema.prisma` :

```bash
npx prisma generate
```

---

## 🔒 Sécurité

### Mesures Implémentées

- ✅ **Hachage des mots de passe** : bcryptjs (12 rounds)
- ✅ **JWT avec expiration** : Access Token (15min) + Refresh Token (7j)
- ✅ **Validation des entrées** : class-validator + class-transformer
- ✅ **Rate limiting** : Protection contre les attaques par force brute
- ✅ **Helmet** : Protection des headers HTTP
- ✅ **CORS** : Configuration stricte
- ✅ **Vérification d'email** : Tokens sécurisés avec expiration
- ✅ **Guards NestJS** : Protection des routes par rôles
- ✅ **Sanitization** : Nettoyage des inputs utilisateurs

### Bonnes Pratiques

1. **Ne jamais committer le fichier `.env`**
2. **Utiliser des secrets forts** (min 32 caractères)
3. **Changer les secrets en production**
4. **Activer HTTPS en production**
5. **Configurer CORS strictement**
6. **Limiter les tentatives de connexion**
7. **Logger les actions de modération**

---

## 🏗️ Architecture

### Principes Suivis

- ✅ **SOLID** : Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- ✅ **Dependency Injection** : Injection de dépendances via NestJS
- ✅ **Modular Structure** : Séparation claire des modules (Auth, Moderation, Common)
- ✅ **Type Safety** : TypeScript strict mode
- ✅ **Security-First** : Sécurité intégrée dès la conception
- ✅ **Scalable Database Design** : Schema Prisma évolutif

### Design Patterns

- **Repository Pattern** : Prisma Service pour l'accès aux données
- **Guard Pattern** : NestJS Guards pour la protection des routes
- **DTO Pattern** : Validation et transformation des données
- **Service Layer Pattern** : Logique métier dans les services
- **Strategy Pattern** : Multiple stratégies d'authentification (Email, Google)

---

## 🐛 Dépannage

### Problèmes Courants

#### 1. Erreur : "Prisma Client not found"

```bash
npx prisma generate
```

#### 2. Erreur : "Port 3000 already in use"

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

#### 3. Erreur : "Database connection failed"

Vérifiez votre `DATABASE_URL` dans `.env` et que PostgreSQL est démarré.

#### 4. Email non envoyé en développement

C'est normal si vous n'êtes pas sur Replit. Consultez les logs du serveur pour voir le token de vérification.

#### 5. Token JWT expiré

Utilisez le endpoint `/auth/refresh` pour obtenir un nouveau token.

#### 6. Erreurs de type TypeScript après modification du schema

```bash
npx prisma generate
# Puis redémarrez VS Code ou rechargez la fenêtre
```

---

## 📖 Ressources Supplémentaires

- 📘 [NestJS Documentation](https://docs.nestjs.com/)
- 🔐 [Better Auth Documentation](https://better-auth.com/)
- 🗄️ [Prisma Documentation](https://www.prisma.io/docs/)
- ✉️ [Nodemailer Documentation](https://nodemailer.com/)
- 🧪 [Jest Documentation](https://jestjs.io/)
- 🔑 [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

## 🚀 Prochaines Étapes

Ce backend est prêt pour extension avec les fonctionnalités marketplace :

- 📦 **Gestion des Produits** : CRUD produits, catégories, images
- 🛒 **Gestion des Commandes** : Panier, checkout, statuts
- 💳 **Paiements** : Intégration Stripe/PayPal
- 💬 **Messagerie** : Chat entre acheteurs/vendeurs
- ⭐ **Évaluations** : Système de notes et avis
- 🔔 **Notifications** : Email + Push notifications
- 📊 **Analytics** : Tableau de bord admin

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de Code

- ✅ Suivre les principes SOLID
- ✅ Ajouter des tests pour chaque feature
- ✅ Commenter le code complexe
- ✅ Respecter les conventions TypeScript/NestJS
- ✅ Valider avec `yarn lint`

---

## 📝 Licence

Ce projet est sous licence [MIT](LICENSE).

---

## 👥 Auteurs

Développé avec ❤️ pour **Tajdeed** - Plateforme C2C de mode d'occasion

---

## 📞 Support

Pour toute question ou problème :
- 📧 Email: support@tajdeed.com
- 💬 Issues: [GitHub Issues](https://github.com/votre-repo/issues)
- 📖 Documentation: Consultez les fichiers `.md` du projet
