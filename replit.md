# Overview

Tajdeed MVP is a C2C marketplace backend built with NestJS and TypeScript. The application follows a modular architecture with clear separation of concerns, providing a foundation for a production-ready marketplace platform. It features user authentication, session management, and comprehensive security measures including rate limiting and security headers.

**Status**: Fully configured and running on Replit (September 30, 2025)

# User Preferences

Preferred communication style: Simple, everyday language.

# Replit Environment Setup

## Configuration (September 30, 2025)
- **Database**: Replit PostgreSQL (Neon-backed) connected via DATABASE_URL environment variable
- **Server Port**: 3000 (backend API)
- **Host Binding**: 0.0.0.0 (required for Replit environment)
- **Workflow**: Backend Server running on `npm run start:dev`
- **Deployment**: Configured for VM deployment with build and production start commands

## Environment Variables
The following environment variables are configured in .env:
- `DATABASE_URL`: Replit PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Authentication secret key
- `NODE_ENV`: Set to "development"
- `PORT`: Set to 3000
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Optional OAuth configuration

## Known Issues
- TypeScript type-checking shows warnings in auth.service.ts and moderation.service.ts related to Better Auth API types
- E2E test files have TypeScript parsing issues due to French language strings (tests excluded from build)
- These warnings don't prevent the application from running successfully

# System Architecture

## Backend Framework
- **NestJS with TypeScript**: Chosen for its modular architecture, built-in dependency injection, and excellent TypeScript support
- **Strict TypeScript mode**: Enabled for enhanced type safety and better development experience
- **Modular structure**: Organized into auth, common utilities, and database modules for maintainability

## Database Layer
- **Prisma ORM**: Selected for type-safe database operations and excellent TypeScript integration
- **PostgreSQL**: Primary database for storing user accounts and sessions
- **Database models**: 
  - AppUser with username, role (USER/ADMIN), and timestamps
  - DeviceSession for managing user sessions with refresh tokens and TTL
  - Role enumeration for access control

## Security Implementation
- **Helmet middleware**: Provides security headers including Content Security Policy
- **Rate limiting**: 100 requests per minute per IP to prevent abuse
- **Global validation**: Input validation using class-validator and class-transformer
- **CORS configuration**: Environment-based CORS settings for development flexibility

## Configuration Management
- **Environment-based config**: Using @nestjs/config with Joi validation
- **Global configuration**: Available throughout the application via dependency injection
- **Validation schema**: Ensures required environment variables are present and properly formatted

## Authentication Architecture
- **Better Auth integration**: Stub configuration prepared for OAuth Google integration
- **Session management**: Device-based sessions with refresh token support
- **Role-based access**: USER and ADMIN roles defined in the database schema

## Middleware Pipeline
- **Global middlewares**: Applied to all routes for consistent security
- **Validation pipeline**: Automatic request validation with whitelist and transformation
- **Error handling**: Structured error responses with appropriate HTTP status codes

# External Dependencies

## Database Services
- **PostgreSQL**: Primary database for user data and sessions
- **Supabase**: Database hosting platform (referenced in setup instructions)

## Authentication Services
- **Google OAuth**: For social login integration (configured but not yet implemented)
- **Better Auth**: Authentication library for handling OAuth flows and session management

## Security Libraries
- **Helmet**: Security middleware for HTTP headers
- **express-rate-limit**: Rate limiting middleware for API protection

## Development Tools
- **Prisma**: Database ORM and migration tool
- **Joi**: Schema validation for environment variables
- **ESLint & Prettier**: Code formatting and linting tools

## Runtime Dependencies
- **Node.js**: Runtime environment
- **Express**: Underlying HTTP server (via NestJS platform-express)
- **RxJS**: Reactive programming library used by NestJS