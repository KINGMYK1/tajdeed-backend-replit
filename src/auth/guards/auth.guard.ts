import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

// Extension de Request pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token d\'accès manquant');
    }

    try {
      const sessionData = await this.authService.validateSession(token);
      
      if (!sessionData) {
        throw new UnauthorizedException('Session invalide ou expirée');
      }

      // Attacher les données utilisateur à la requête
      request.user = sessionData.user;
      request.session = { 
        id: sessionData.sessionId,
        expiresAt: sessionData.expiresAt 
      };

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException('Token invalide: ' + errorMessage);
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Vérifier d'abord l'authentification
    const authGuard = new AuthGuard(this.authService);
    const isAuthenticated = await authGuard.canActivate(context);
    
    if (!isAuthenticated) {
      return false;
    }

    // Vérifier le rôle admin
    if (request.user?.role !== 'ADMIN') {
      throw new UnauthorizedException('Accès réservé aux administrateurs');
    }

    return true;
  }
}