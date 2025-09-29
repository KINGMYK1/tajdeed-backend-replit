import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  Req, 
  HttpStatus, 
  HttpCode,
  Query,
  Param,
  Put,
} from '@nestjs/common';
import { Request } from 'express';
import { ModerationService } from './moderation.service';
import { AuthGuard, AdminGuard } from '../auth/guards/auth.guard';
import { ModerationActionDto, UserWarningDto } from '../auth/dto/auth.dto';

/**
 * Contrôleur de modération pour Tajdeed
 * Gère les actions de modération, les avertissements et la surveillance des utilisateurs
 * 
 * Accès:
 * - ADMIN et SUPER_ADMIN: Toutes les actions de modération
 * - MODERATOR: Actions limitées (avertissements, suspensions temporaires)
 * - USER: Aucun accès aux endpoints de modération
 */
@Controller('moderation')
@UseGuards(AuthGuard) // Tous les endpoints nécessitent une authentification
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * Appliquer une action de modération sur un utilisateur
   * 
   * Actions disponibles:
   * - WARNING: Avertissement simple
   * - TEMPORARY_SUSPENSION: Suspension temporaire (durée requise)
   * - PERMANENT_BAN: Bannissement permanent
   * - CONTENT_REMOVAL: Suppression de contenu
   * - ACCOUNT_RESTRICTION: Restriction de compte
   */
  @Post('action')
  @UseGuards(AdminGuard) // Seuls les admins/modérateurs peuvent effectuer des actions
  @HttpCode(HttpStatus.CREATED)
  async applyModerationAction(
    @Body() actionDto: ModerationActionDto,
    @Req() req: Request,
  ): Promise<{ message: string; actionId: string }> {
    const moderatorId = req.user.id;
    
    const result = await this.moderationService.applyModerationAction(
      actionDto,
      moderatorId,
    );
    
    return {
      message: `Action de modération "${actionDto.action}" appliquée avec succès`,
      actionId: result.actionId,
    };
  }

  /**
   * Ajouter un avertissement à un utilisateur
   * Version simplifiée pour les modérateurs moins expérimentés
   */
  @Post('warning')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async addUserWarning(
    @Body() warningDto: UserWarningDto,
    @Req() req: Request,
  ): Promise<{ message: string; warningId: string }> {
    const moderatorId = req.user.id;
    
    const result = await this.moderationService.addUserWarning(
      warningDto,
      moderatorId,
    );
    
    return {
      message: 'Avertissement ajouté avec succès',
      warningId: result.warningId,
    };
  }

  /**
   * Obtenir l'historique de modération d'un utilisateur
   */
  @Get('user/:userId/history')
  @UseGuards(AdminGuard)
  async getUserModerationHistory(
    @Param('userId') userId: string,
  ): Promise<{
    moderationActions: any[];
    warnings: any[];
    currentStatus: string;
  }> {
    return await this.moderationService.getUserModerationHistory(userId);
  }

  /**
   * Lister les utilisateurs modérés avec filtres
   */
  @Get('users')
  @UseGuards(AdminGuard)
  async getModeratedUsers(
    @Query('status') status?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    users: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return await this.moderationService.getModeratedUsers({
      status,
      action,
      page: pageNum,
      limit: limitNum,
    });
  }

  /**
   * Révoquer ou modifier une action de modération
   */
  @Put('action/:actionId/revoke')
  @UseGuards(AdminGuard)
  async revokeModerationAction(
    @Param('actionId') actionId: string,
    @Req() req: Request,
    @Body() body: { reason: string },
  ): Promise<{ message: string }> {
    const moderatorId = req.user.id;
    
    await this.moderationService.revokeModerationAction(
      actionId,
      moderatorId,
      body.reason,
    );
    
    return {
      message: 'Action de modération révoquée avec succès',
    };
  }

  /**
   * Obtenir les statistiques de modération
   * Utile pour le tableau de bord des administrateurs
   */
  @Get('stats')
  @UseGuards(AdminGuard)
  async getModerationStats(): Promise<{
    totalActions: number;
    activeWarnings: number;
    bannedUsers: number;
    suspendedUsers: number;
    actionsThisMonth: number;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    return await this.moderationService.getModerationStats();
  }

  /**
   * Obtenir les avertissements d'un utilisateur (pour l'utilisateur lui-même)
   */
  @Get('my-warnings')
  async getMyWarnings(@Req() req: Request): Promise<{
    warnings: any[];
    unreadCount: number;
  }> {
    const userId = req.user.id;
    return await this.moderationService.getUserWarnings(userId);
  }

  /**
   * Marquer les avertissements comme lus
   */
  @Put('my-warnings/read')
  async markWarningsAsRead(@Req() req: Request): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.moderationService.markWarningsAsRead(userId);
    
    return {
      message: 'Avertissements marqués comme lus',
    };
  }
}