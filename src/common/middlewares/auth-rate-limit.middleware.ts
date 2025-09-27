import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par IP toutes les 15 minutes
    message: {
      error: 'Trop de tentatives d\'authentification. Réessayez dans 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Utiliser l'IP + User-Agent pour un rate limiting plus fin
      return `${req.ip}-${req.get('User-Agent')}`;
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.rateLimiter(req, res, next);
  }
}