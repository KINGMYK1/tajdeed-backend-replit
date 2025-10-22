import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

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
      if (!sessionData.user) {
        throw new UnauthorizedException('Utilisateur introuvable pour cette session');
      }

      (request as any).user = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name ?? null,
        role: sessionData.user.role,
        emailVerified: sessionData.user.emailVerified ?? false,
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
  private readonly authGuard: AuthGuard;

  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {
    this.authGuard = new AuthGuard(this.authService, this.reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const isAuthenticated = await this.authGuard.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Vérifier le rôle admin, moderator ou super admin
    const user = (request as any).user;
    const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    
    if (!user || !allowedRoles.includes(user.role)) {
      throw new UnauthorizedException('Accès réservé aux modérateurs, administrateurs et super-administrateurs');
    }

    return true;
  }
}