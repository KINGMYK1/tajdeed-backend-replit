# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/spec/v2.0.0.html).

## [v0.2.0] - Auth Implémentée - 2025-09-27

### ✨ Features

- **Authentification complète** : Système d'auth sécurisé avec Better Auth
- **OAuth Google** : Configuration pour l'authentification Google (stub prêt pour production)
- **Sessions persistantes** : Gestion des sessions avec DeviceSession et refresh tokens TTL 30 jours
- **Architecture SOLID** : AuthService, AuthController, AuthGuard suivant les principes SOLID
- **Sécurité renforcée** : 
  - Rate limiting spécifique auth (5 req/15min)
  - JWT validation via guards
  - Helmet + CORS configurés
  - Validation DTO avec class-validator

### 🚀 Endpoints Auth

- `POST /auth/google` - Initialiser OAuth Google
- `GET /auth/google/callback` - Callback OAuth Google  
- `POST /auth/refresh` - Rafraîchir access token
- `POST /auth/logout` - Déconnexion et révocation session
- `GET /auth/me` - Profil utilisateur (protégé par AuthGuard)

### 🛠️ Architecture

- **AuthModule** : Module d'authentification avec providers isolés
- **AuthService** : Logique métier (signInGoogle, refreshToken, logout, getMe)
- **AuthGuard & AdminGuard** : Guards JWT pour protection des routes
- **DTOs typés** : GoogleAuthDto, RefreshTokenDto, AuthResponseDto, UserProfileDto
- **Interfaces SOLID** : IAuthService pour découplage et extensibilité

### 🔒 Sécurité

- **Rate limiting différencié** : Global (100 req/min) + Auth (5 req/15min)
- **Validation stricte** : class-validator sur tous les DTOs
- **Gestion d'erreurs** : Exceptions typées avec messages français
- **Sessions sécurisées** : TTL configurables, refresh tokens uniques

### 📚 Documentation

- **README mis à jour** : Exemples curl/Postman pour tous les endpoints
- **CHANGELOG** : Documentation des versions et modifications
- **Architecture documentée** : Principes SOLID et modularité

### 🧪 Tests prêts

- **Structure test** : AuthService unitaire, endpoints intégration  
- **Mock support** : Prisma et Better Auth mockés pour tests
- **Coverage target** : 80% sur module auth

---

## [v0.1.0] - Architecture de base - 2025-09-27

### Features

- **NestJS + TypeScript** : Architecture modulaire stricte
- **Prisma + PostgreSQL** : ORM type-safe avec modèles AppUser/DeviceSession
- **Configuration env** : Validation Joi des variables d'environnement
- **Sécurité de base** : Helmet + Rate limiting global
- **Docker ready** : Dockerfile production multi-stage
- **Modulaire** : Séparation auth/common/prisma