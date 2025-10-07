import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AuthGuard } from './auth.guard';

/**
 * Guard pour les modérateurs et niveaux supérieurs
 * Autorise : MODERATOR, ADMIN, SUPER_ADMIN
 * Bloque : USER
 */
@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Vérifier d'abord l'authentification
    const authGuard = new AuthGuard(this.authService);
    const isAuthenticated = await authGuard.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Vérifier le rôle modérateur ou supérieur
    const user = (request as any).user;
    const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Accès réservé aux modérateurs, administrateurs et super-administrateurs',
      );
    }

    return true;
  }
}

/**
 * Guard pour les administrateurs et niveaux supérieurs
 * Autorise : ADMIN, SUPER_ADMIN
 * Bloque : USER, MODERATOR
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Vérifier d'abord l'authentification
    const authGuard = new AuthGuard(this.authService);
    const isAuthenticated = await authGuard.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Vérifier le rôle admin ou super admin uniquement
    const user = (request as any).user;
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Accès réservé aux administrateurs et super-administrateurs uniquement',
      );
    }

    return true;
  }
}

/**
 * Guard pour les super-administrateurs uniquement
 * Autorise : SUPER_ADMIN uniquement
 * Bloque : USER, MODERATOR, ADMIN
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Vérifier d'abord l'authentification
    const authGuard = new AuthGuard(this.authService);
    const isAuthenticated = await authGuard.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Vérifier le rôle super admin uniquement
    const user = (request as any).user;

    if (!user || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Accès réservé aux super-administrateurs uniquement',
      );
    }

    return true;
  }
}
