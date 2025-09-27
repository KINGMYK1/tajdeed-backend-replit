# Overview

Tajdeed MVP is a C2C marketplace backend built with NestJS and TypeScript. The application follows a modular architecture with clear separation of concerns, providing a foundation for a production-ready marketplace platform. It features user authentication, session management, and comprehensive security measures including rate limiting and security headers.

# User Preferences

Preferred communication style: Simple, everyday language.

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