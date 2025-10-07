import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

// Extension de Request pour inclure user
// Interface étendue pour Request avec authentification
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: boolean;
  };
  sessionId: string;
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
      (request as any).user = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        role: sessionData.user.role,
        emailVerified: sessionData.user.emailVerified,
      };
      (request as any).sessionId = sessionData.sessionId;

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
    const user = (request as any).user;
    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Accès réservé aux administrateurs');
    }

    return true;
  }
}