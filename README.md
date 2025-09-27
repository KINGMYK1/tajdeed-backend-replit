# Tajdeed MVP Backend

A complete, production-ready NestJS TypeScript backend for "Tajdeed MVP" - a C2C marketplace with modular architecture and Prisma/Supabase integration.

## Features

- **Modular Architecture**: Clean separation of concerns with dedicated modules for auth, common utilities, and database
- **Security**: Helmet for security headers and rate limiting (100 requests/minute)
- **Database**: Prisma ORM with PostgreSQL support
- **Configuration**: Environment-based configuration with validation
- **TypeScript**: Strict mode enabled for type safety
- **Better Auth**: Configured for OAuth Google integration

## Project Structure

```
src/
├── app.module.ts          # Main application module
├── main.ts               # Application bootstrap
├── auth/                 # Authentication configuration
│   └── auth.config.ts    # Better Auth setup
├── common/               # Shared utilities
│   ├── config.module.ts  # Environment configuration
│   └── middlewares/      # Security middlewares
│       ├── helmet.middleware.ts
│       └── rate-limit.middleware.ts
└── prisma/               # Database service
    └── prisma.service.ts
prisma/
└── schema.prisma         # Database schema
```

## Database Models

- **AppUser**: User accounts with username and role
- **DeviceSession**: User session management with refresh tokens
- **Role**: USER/ADMIN role enumeration

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

## Development

The application uses hot-reload in development mode. Any changes to TypeScript files will automatically restart the server.

## Architecture

This backend follows NestJS best practices with:
- Dependency injection
- Modular structure
- Type-safe configuration
- Security-first approach
- Scalable database design

Ready for extension with additional marketplace features like products, orders, payments, and user management.