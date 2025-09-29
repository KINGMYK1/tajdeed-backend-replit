import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    username: 'test@example.com',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeviceSession = {
    id: 'session-123',
    userId: 'user-123',
    refreshHash: 'hashed-refresh-token',
    ttlDays: 30,
    createdAt: new Date(),
    user: mockUser,
  };

  // Mock implementations
  const mockPrismaService = {
    appUser: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    deviceSession: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('signInGoogle', () => {
    it('devrait créer un nouvel utilisateur et retourner des tokens valides', async () => {
      // Arrange
      const code = 'valid-google-code';
      mockPrismaService.appUser.findFirst.mockResolvedValue(null);
      mockPrismaService.appUser.create.mockResolvedValue(mockUser);
      mockPrismaService.deviceSession.create.mockResolvedValue(mockDeviceSession);
      mockPrismaService.deviceSession.update.mockResolvedValue(mockDeviceSession);

      // Act
      const result = await service.signInGoogle(code);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual(mockUser);
      expect(result.expiresIn).toBe(900);
      expect(mockPrismaService.appUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'test@example.com',
          role: Role.USER,
        }),
      });
      expect(mockPrismaService.deviceSession.create).toHaveBeenCalled();
      expect(mockPrismaService.deviceSession.update).toHaveBeenCalled();
    });

    it('devrait utiliser un utilisateur existant s\\'il existe déjà', async () => {
      // Arrange
      const code = 'valid-google-code';
      mockPrismaService.appUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.deviceSession.create.mockResolvedValue(mockDeviceSession);
      mockPrismaService.deviceSession.update.mockResolvedValue(mockDeviceSession);

      // Act
      const result = await service.signInGoogle(code);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.appUser.create).not.toHaveBeenCalled();
      expect(mockPrismaService.appUser.findFirst).toHaveBeenCalledWith({
        where: { username: 'test@example.com' },
      });
    });

    it('devrait lever une BadRequestException en cas d\\'erreur', async () => {
      // Arrange
      const code = 'invalid-code';
      mockPrismaService.appUser.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.signInGoogle(code)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('devrait renouveler les tokens avec un refresh token valide', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const validSession = {
        ...mockDeviceSession,
        createdAt: new Date(), // Session récente
      };
      mockPrismaService.deviceSession.findFirst.mockResolvedValue(validSession);
      mockPrismaService.deviceSession.update.mockResolvedValue(validSession);

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual(mockUser);
      expect(mockPrismaService.deviceSession.update).toHaveBeenCalled();
    });

    it('devrait lever UnauthorizedException avec un refresh token invalide', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      mockPrismaService.deviceSession.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException avec un token expiré', async () => {
      // Arrange
      const refreshToken = 'expired-refresh-token';
      const expiredSession = {
        ...mockDeviceSession,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 jours ago
        ttlDays: 30,
      };
      mockPrismaService.deviceSession.findFirst.mockResolvedValue(expiredSession);
      mockPrismaService.deviceSession.delete.mockResolvedValue(expiredSession);

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.deviceSession.delete).toHaveBeenCalledWith({
        where: { id: expiredSession.id },
      });
    });
  });

  describe('logout', () => {
    it('devrait supprimer la session avec succès', async () => {
      // Arrange
      const sessionId = 'session-123';
      mockPrismaService.deviceSession.delete.mockResolvedValue(mockDeviceSession);

      // Act
      await service.logout(sessionId);

      // Assert
      expect(mockPrismaService.deviceSession.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
    });

    it('ne devrait pas lever d\\'erreur même si la suppression échoue', async () => {
      // Arrange
      const sessionId = 'invalid-session';
      mockPrismaService.deviceSession.delete.mockRejectedValue(new Error('Session not found'));

      // Act & Assert
      await expect(service.logout(sessionId)).resolves.not.toThrow();
    });
  });

  describe('validateSession', () => {
    it('devrait valider une session avec un token d\\'accès valide', async () => {
      // Arrange
      // On doit d'abord générer un token valide via signInGoogle
      mockPrismaService.appUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.deviceSession.create.mockResolvedValue(mockDeviceSession);
      mockPrismaService.deviceSession.update.mockResolvedValue(mockDeviceSession);
      
      const authResult = await service.signInGoogle('test-code');
      
      // Reset mocks et setup pour validateSession
      jest.clearAllMocks();
      mockPrismaService.deviceSession.findFirst.mockResolvedValue(mockDeviceSession);

      // Act
      const result = await service.validateSession(authResult.accessToken);

      // Assert
      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUser.id);
      expect(result?.user).toEqual(mockUser);
      expect(result?.sessionId).toBe(mockDeviceSession.id);
    });

    it('devrait retourner null pour un token invalide', async () => {
      // Arrange
      const invalidToken = 'invalid-token';

      // Act
      const result = await service.validateSession(invalidToken);

      // Assert
      expect(result).toBeNull();
    });

    it('devrait retourner null si la session n\\'existe pas en base', async () => {
      // Arrange
      mockPrismaService.appUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.deviceSession.create.mockResolvedValue(mockDeviceSession);
      mockPrismaService.deviceSession.update.mockResolvedValue(mockDeviceSession);
      
      const authResult = await service.signInGoogle('test-code');
      
      // Reset mocks - session n'existe plus
      jest.clearAllMocks();
      mockPrismaService.deviceSession.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.validateSession(authResult.accessToken);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getMe', () => {
    it('devrait retourner les données utilisateur pour une session valide', async () => {
      // Arrange
      const sessionId = 'valid-session-id';
      
      // Mock validateSession pour retourner des données valides
      jest.spyOn(service, 'validateSession').mockResolvedValue({
        sessionId,
        userId: mockUser.id,
        user: mockUser,
        expiresAt: new Date(Date.now() + 900000),
      });

      // Act
      const result = await service.getMe(sessionId);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('devrait retourner null pour une session invalide', async () => {
      // Arrange
      const sessionId = 'invalid-session-id';
      jest.spyOn(service, 'validateSession').mockResolvedValue(null);

      // Act
      const result = await service.getMe(sessionId);

      // Assert
      expect(result).toBeNull();
    });
  });
});