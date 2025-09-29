import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  ModerationAction, 
  WarningSeverity, 
  UserStatus, 
  Role 
} from '@prisma/client';
import { ModerationActionDto, UserWarningDto } from '../auth/dto/auth.dto';

/**
 * Service de modération pour Tajdeed
 * 
 * Principe SOLID appliqué:
 * - Single Responsibility: Gère uniquement la modération
 * - Open/Closed: Extensible pour nouveaux types d'actions
 * - Liskov Substitution: Interface cohérente pour toutes les actions
 * - Interface Segregation: Méthodes spécialisées par cas d'usage
 * - Dependency Inversion: Dépend de l'abstraction PrismaService
 */
@Injectable()
export class ModerationService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Appliquer une action de modération sur un utilisateur
   * 
   * Vérifications de sécurité:
   * - Le modérateur ne peut pas se modérer lui-même
   * - Les modérateurs ne peuvent pas modérer les admins
   * - Validation des permissions selon le rôle
   */
  async applyModerationAction(
    actionDto: ModerationActionDto,
    moderatorId: string,
  ): Promise<{ actionId: string }> {
    // Vérifications de base
    await this.validateModerationRequest(actionDto.userId, moderatorId, actionDto.action);

    // Calculer la date d'expiration pour les actions temporaires
    const expiresAt = actionDto.duration 
      ? new Date(Date.now() + actionDto.duration * 60 * 60 * 1000) // convertir heures en millisecondes
      : null;

    // Créer l'action de modération
    const moderationAction = await this.prismaService.moderatedUser.create({
      data: {
        userId: actionDto.userId,
        moderatorId,
        action: actionDto.action as ModerationAction,
        reason: actionDto.reason,
        duration: actionDto.duration,
        evidence: actionDto.evidence,
        notes: actionDto.notes,
        expiresAt,
        isActive: true,
      },
    });

    // Appliquer l'effet de l'action sur le compte utilisateur
    await this.applyActionEffect(actionDto.userId, actionDto.action as ModerationAction);

    // Envoyer une notification à l'utilisateur
    await this.notifyUserOfModeration(actionDto.userId, actionDto.action, actionDto.reason);

    // Log de l'action pour audit
    console.log(`Moderation action applied: ${actionDto.action} on user ${actionDto.userId} by ${moderatorId}`);

    return { actionId: moderationAction.id };
  }

  /**
   * Ajouter un avertissement à un utilisateur
   * Version simplifiée pour les modérateurs
   */
  async addUserWarning(
    warningDto: UserWarningDto,
    moderatorId: string,
  ): Promise<{ warningId: string }> {
    // Vérifier que l'utilisateur existe et peut être averti
    await this.validateModerationRequest(warningDto.userId, moderatorId, 'WARNING');

    // Créer l'avertissement
    const warning = await this.prismaService.userWarning.create({
      data: {
        userId: warningDto.userId,
        reason: warningDto.reason,
        severity: warningDto.severity as WarningSeverity,
        isRead: false,
      },
    });

    // Envoyer une notification
    await this.notifyUserOfWarning(warningDto.userId, warningDto.reason, warningDto.severity);

    return { warningId: warning.id };
  }

  /**
   * Obtenir l'historique complet de modération d'un utilisateur
   */
  async getUserModerationHistory(userId: string): Promise<{
    moderationActions: any[];
    warnings: any[];
    currentStatus: string;
  }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const [moderationActions, warnings] = await Promise.all([
      this.prismaService.moderatedUser.findMany({
        where: { userId },
        include: {
          moderator: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.userWarning.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      moderationActions,
      warnings,
      currentStatus: user.status,
    };
  }

  /**
   * Lister les utilisateurs modérés avec filtres et pagination
   */
  async getModeratedUsers(filters: {
    status?: string;
    action?: string;
    page: number;
    limit: number;
  }): Promise<{
    users: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (filters.page - 1) * filters.limit;
    
    const whereClause: any = {};
    
    if (filters.status) {
      whereClause.user = { status: filters.status };
    }
    
    if (filters.action) {
      whereClause.action = filters.action;
    }

    const [users, total] = await Promise.all([
      this.prismaService.moderatedUser.findMany({
        where: whereClause,
        include: {
          user: {
            select: { 
              id: true, 
              email: true, 
              name: true, 
              username: true, 
              status: true, 
              createdAt: true 
            },
          },
          moderator: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
      }),
      this.prismaService.moderatedUser.count({ where: whereClause }),
    ]);

    return {
      users,
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  /**
   * Révoquer une action de modération
   */
  async revokeModerationAction(
    actionId: string,
    moderatorId: string,
    reason: string,
  ): Promise<void> {
    const action = await this.prismaService.moderatedUser.findUnique({
      where: { id: actionId },
      include: { user: true },
    });

    if (!action) {
      throw new NotFoundException('Action de modération non trouvée');
    }

    if (!action.isActive) {
      throw new BadRequestException('Cette action est déjà inactive');
    }

    // Marquer l'action comme inactive
    await this.prismaService.moderatedUser.update({
      where: { id: actionId },
      data: {
        isActive: false,
        notes: `${action.notes || ''}\n\nRévoquée le ${new Date().toISOString()} par ${moderatorId}. Raison: ${reason}`,
      },
    });

    // Rétablir le statut utilisateur si c'était un ban ou une suspension
    if (action.action === ModerationAction.PERMANENT_BAN || 
        action.action === ModerationAction.TEMPORARY_SUSPENSION) {
      await this.prismaService.user.update({
        where: { id: action.userId },
        data: { status: UserStatus.ACTIVE },
      });
    }

    // Log de la révocation
    console.log(`Moderation action ${actionId} revoked by ${moderatorId}. Reason: ${reason}`);
  }

  /**
   * Obtenir les statistiques de modération pour le tableau de bord
   */
  async getModerationStats(): Promise<{
    totalActions: number;
    activeWarnings: number;
    bannedUsers: number;
    suspendedUsers: number;
    actionsThisMonth: number;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalActions,
      activeWarnings,
      bannedUsers,
      suspendedUsers,
      actionsThisMonth,
      topReasonsRaw,
    ] = await Promise.all([
      this.prismaService.moderatedUser.count(),
      this.prismaService.userWarning.count({
        where: { 
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      this.prismaService.user.count({
        where: { status: UserStatus.BANNED },
      }),
      this.prismaService.user.count({
        where: { status: UserStatus.SUSPENDED },
      }),
      this.prismaService.moderatedUser.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prismaService.moderatedUser.groupBy({
        by: ['reason'],
        _count: { reason: true },
        orderBy: { _count: { reason: 'desc' } },
        take: 5,
      }),
    ]);

    const topReasons = topReasonsRaw.map(item => ({
      reason: item.reason,
      count: item._count.reason,
    }));

    return {
      totalActions,
      activeWarnings,
      bannedUsers,
      suspendedUsers,
      actionsThisMonth,
      topReasons,
    };
  }

  /**
   * Obtenir les avertissements d'un utilisateur
   */
  async getUserWarnings(userId: string): Promise<{
    warnings: any[];
    unreadCount: number;
  }> {
    const [warnings, unreadCount] = await Promise.all([
      this.prismaService.userWarning.findMany({
        where: { 
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.userWarning.count({
        where: { 
          userId, 
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
    ]);

    return { warnings, unreadCount };
  }

  /**
   * Marquer les avertissements comme lus
   */
  async markWarningsAsRead(userId: string): Promise<void> {
    await this.prismaService.userWarning.updateMany({
      where: { 
        userId, 
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      data: { isRead: true },
    });
  }

  // === Méthodes privées utilitaires ===

  /**
   * Valider une demande de modération
   */
  private async validateModerationRequest(
    userId: string,
    moderatorId: string,
    action: string,
  ): Promise<void> {
    // Vérifier que l'utilisateur cible existe
    const targetUser = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur cible non trouvé');
    }

    // Vérifier que le modérateur existe et a les permissions
    const moderator = await this.prismaService.user.findUnique({
      where: { id: moderatorId },
      select: { id: true, role: true },
    });

    if (!moderator) {
      throw new ForbiddenException('Modérateur non trouvé');
    }

    // Auto-modération interdite
    if (userId === moderatorId) {
      throw new ForbiddenException('Vous ne pouvez pas vous modérer vous-même');
    }

    // Vérifier les permissions selon la hiérarchie des rôles
    if (targetUser.role === Role.ADMIN && moderator.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Seuls les super administrateurs peuvent modérer les administrateurs');
    }

    if (targetUser.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Les super administrateurs ne peuvent pas être modérés');
    }

    // Vérifier les permissions spécifiques selon l'action
    if (action === 'PERMANENT_BAN' && moderator.role === Role.MODERATOR) {
      throw new ForbiddenException('Seuls les administrateurs peuvent bannir définitivement');
    }
  }

  /**
   * Appliquer l'effet d'une action de modération sur le compte utilisateur
   */
  private async applyActionEffect(userId: string, action: ModerationAction): Promise<void> {
    let newStatus: UserStatus | null = null;

    switch (action) {
      case ModerationAction.PERMANENT_BAN:
        newStatus = UserStatus.BANNED;
        break;
      case ModerationAction.TEMPORARY_SUSPENSION:
        newStatus = UserStatus.SUSPENDED;
        break;
      case ModerationAction.ACCOUNT_RESTRICTION:
        newStatus = UserStatus.SUSPENDED; // Traité comme une suspension légère
        break;
      // WARNING et CONTENT_REMOVAL n'affectent pas le statut du compte
    }

    if (newStatus) {
      await this.prismaService.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });
    }
  }

  /**
   * Notifier un utilisateur d'une action de modération
   */
  private async notifyUserOfModeration(
    userId: string,
    action: string,
    reason: string,
  ): Promise<void> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return;

      const { sendEmail } = await import('../utils/replitmail');
      
      const actionMessages = {
        WARNING: 'Vous avez reçu un avertissement',
        TEMPORARY_SUSPENSION: 'Votre compte a été temporairement suspendu',
        PERMANENT_BAN: 'Votre compte a été définitivement banni',
        CONTENT_REMOVAL: 'Du contenu a été supprimé de votre compte',
        ACCOUNT_RESTRICTION: 'Des restrictions ont été appliquées à votre compte',
      };

      const subject = `Tajdeed - ${actionMessages[action] || 'Action de modération'}`;
      
      await sendEmail({
        to: user.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d73027;">Notification de modération - Tajdeed</h1>
            <p>Bonjour ${user.name || ''},</p>
            <p><strong>${actionMessages[action] || 'Une action de modération a été appliquée'}</strong></p>
            <p><strong>Raison :</strong> ${reason}</p>
            <p>Si vous pensez que cette action est injustifiée, vous pouvez contacter notre équipe de support.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Équipe Modération Tajdeed</p>
          </div>
        `,
        text: `Notification de modération - Tajdeed\n\n${actionMessages[action] || 'Une action de modération a été appliquée'}\n\nRaison: ${reason}\n\nSi vous pensez que cette action est injustifiée, contactez notre support.\n\nÉquipe Modération Tajdeed`,
      });
    } catch (error) {
      console.error('Erreur envoi email modération:', error);
    }
  }

  /**
   * Notifier un utilisateur d'un avertissement
   */
  private async notifyUserOfWarning(
    userId: string,
    reason: string,
    severity: string,
  ): Promise<void> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return;

      const severityColors = {
        LOW: '#ffc107',
        MEDIUM: '#fd7e14',
        HIGH: '#dc3545',
        CRITICAL: '#6f42c1',
      };

      const { sendEmail } = await import('../utils/replitmail');
      
      await sendEmail({
        to: user.email,
        subject: `Tajdeed - Avertissement (${severity})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: ${severityColors[severity]};">Avertissement - Tajdeed</h1>
            <p>Bonjour ${user.name || ''},</p>
            <p>Vous avez reçu un avertissement de niveau <strong style="color: ${severityColors[severity]};">${severity}</strong>.</p>
            <p><strong>Raison :</strong> ${reason}</p>
            <p>Veuillez prendre en compte cet avertissement pour éviter d'autres mesures disciplinaires.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Équipe Modération Tajdeed</p>
          </div>
        `,
        text: `Avertissement - Tajdeed\n\nVous avez reçu un avertissement de niveau ${severity}.\n\nRaison: ${reason}\n\nVeuillez prendre en compte cet avertissement.\n\nÉquipe Modération Tajdeed`,
      });
    } catch (error) {
      console.error('Erreur envoi email avertissement:', error);
    }
  }
}