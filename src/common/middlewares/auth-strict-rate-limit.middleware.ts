import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter strict pour les endpoints ultra-sensibles
 * 3 tentatives par 15 minutes pour prévenir les abus
 * 
 * Appliqué sur:
 * - /auth/forgot-password (prévenir spam d'emails)
 * - /auth/resend-verification (prévenir spam d'emails)
 * - /auth/verify-email (prévenir brute force de codes)
 */
@Injectable()
export class AuthStrictRateLimitMiddleware implements NestMiddleware {
  private limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requêtes maximum
    message: {
      error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.',
      code: 'AUTH_STRICT_RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60, // En secondes
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Générer une clé unique par IP + User-Agent pour éviter partage de limite
    keyGenerator: (req: Request) => {
      return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}
