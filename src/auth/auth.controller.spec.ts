import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthDto, RefreshTokenDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    username: 'test@example.com',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResult = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
    expiresIn: 900,
  };

  const mockAuthService = {
    signInGoogle: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('signInGoogle', () => {
    it('devrait retourner une réponse d\\'authentification valide', async () => {
      // Arrange
      const googleAuthDto: GoogleAuthDto = { code: 'valid-google-code' };
      mockAuthService.signInGoogle.mockResolvedValue(mockAuthResult);

      // Act
      const result = await controller.signInGoogle(googleAuthDto);

      // Assert
      expect(result).toEqual({
        accessToken: mockAuthResult.accessToken,
        refreshToken: mockAuthResult.refreshToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
        },
        expiresIn: mockAuthResult.expiresIn,
      });
      expect(mockAuthService.signInGoogle).toHaveBeenCalledWith(googleAuthDto.code);
    });

    it('devrait propager les erreurs du service', async () => {
      // Arrange
      const googleAuthDto: GoogleAuthDto = { code: 'invalid-code' };
      const error = new BadRequestException('Invalid code');
      mockAuthService.signInGoogle.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.signInGoogle(googleAuthDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('googleCallback', () => {
    it('devrait traiter le callback avec un code valide', async () => {
      // Arrange
      const mockRequest = {
        query: {
          code: 'valid-callback-code',
          state: 'test-state',
        },
      } as any;
      mockAuthService.signInGoogle.mockResolvedValue(mockAuthResult);

      // Act
      const result = await controller.googleCallback(mockRequest);

      // Assert
      expect(result).toEqual({
        message: 'Authentification réussie',
        accessToken: mockAuthResult.accessToken,
        refreshToken: mockAuthResult.refreshToken,
        user: mockAuthResult.user,
      });
      expect(mockAuthService.signInGoogle).toHaveBeenCalledWith('valid-callback-code');
    });

    it('devrait lever BadRequestException si le code est manquant', async () => {
      // Arrange
      const mockRequest = {
        query: {},
      } as any;

      // Act & Assert
      await expect(controller.googleCallback(mockRequest)).rejects.toThrow(
        new BadRequestException('Code d\\'autorisation manquant'),
      );
    });
  });

  describe('refreshToken', () => {
    it('devrait renouveler les tokens avec succès', async () => {
      // Arrange
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'valid-refresh-token' };
      mockAuthService.refreshToken.mockResolvedValue(mockAuthResult);

      // Act
      const result = await controller.refreshToken(refreshTokenDto);

      // Assert
      expect(result).toEqual({
        accessToken: mockAuthResult.accessToken,
        refreshToken: mockAuthResult.refreshToken,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role,
        },
        expiresIn: mockAuthResult.expiresIn,
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });

    it('devrait propager les erreurs du service', async () => {
      // Arrange
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'invalid-refresh-token' };
      const error = new BadRequestException('Invalid refresh token');
      mockAuthService.refreshToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('devrait déconnecter l\\'utilisateur avec succès', async () => {
      // Arrange
      const mockRequest = {
        session: { id: 'session-123' },
      } as any;
      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(mockRequest);

      // Assert
      expect(result).toBeUndefined();
      expect(mockAuthService.logout).toHaveBeenCalledWith('session-123');
    });

    it('ne devrait pas appeler logout si aucune session', async () => {
      // Arrange
      const mockRequest = {} as any;

      // Act
      await controller.logout(mockRequest);

      // Assert
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('devrait retourner le profil utilisateur', async () => {
      // Arrange
      const mockRequest = {
        user: mockUser,
      } as any;

      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });
  });
});