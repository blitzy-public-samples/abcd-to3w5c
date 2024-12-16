/**
 * @fileoverview Comprehensive unit tests for AuthService covering all authentication flows,
 * token management, security validations, and Auth0 integration scenarios.
 * 
 * @version 1.0.0
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, jest } from '@jest/globals'; // ^29.0.0
import { AuthenticationClient as Auth0Client, ManagementClient } from 'auth0'; // ^3.3.0
import { sign, verify } from 'jsonwebtoken'; // ^9.0.0
import MockDate from 'mockdate'; // ^3.0.0

import { AuthService } from '../../src/services/auth.service';
import { AuthProvider, TokenType, UserCredentials, AuthToken } from '../../src/interfaces/auth.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorMessages } from '../../../shared/constants/messages';
import { AppError } from '../../../shared/interfaces/error.interface';

// Mock Auth0 clients
jest.mock('auth0');

describe('AuthService', () => {
  // Test fixtures
  let authService: AuthService;
  let mockAuth0Client: jest.Mocked<Auth0Client>;
  let mockManagementClient: jest.Mocked<ManagementClient>;

  const testUser: UserCredentials = {
    email: 'test@example.com',
    password: 'Test123!@#',
    provider: AuthProvider.EMAIL,
    mfaToken: '123456'
  };

  const testTokens = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 1800,
    tokenType: TokenType.ACCESS
  };

  const mockJwtPayload = {
    userId: 'test-user-id',
    email: testUser.email,
    version: 1,
    type: TokenType.ACCESS
  };

  beforeAll(() => {
    // Set up environment variables
    process.env.AUTH0_DOMAIN = 'test.auth0.com';
    process.env.AUTH0_CLIENT_ID = 'test-client-id';
    process.env.AUTH0_CLIENT_SECRET = 'test-client-secret';
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Initialize mock dates
    MockDate.set('2023-01-01T00:00:00.000Z');
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mock Auth0 clients
    mockAuth0Client = new Auth0Client({}) as jest.Mocked<Auth0Client>;
    mockManagementClient = new ManagementClient({}) as jest.Mocked<ManagementClient>;

    // Initialize AuthService with mocked dependencies
    authService = new AuthService();
    (authService as any).auth0Client = mockAuth0Client;
    (authService as any).managementClient = mockManagementClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    MockDate.reset();
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const auth0Response = {
        access_token: 'auth0.access.token',
        refresh_token: 'auth0.refresh.token',
        id_token: 'auth0.id.token',
        expires_in: 86400
      };

      mockAuth0Client.passwordGrant.mockResolvedValue(auth0Response);
      
      // Act
      const result = await authService.login(testUser);

      // Assert
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token.accessToken).toBeDefined();
      expect(result.token.refreshToken).toBeDefined();
      expect(mockAuth0Client.passwordGrant).toHaveBeenCalledWith({
        username: testUser.email,
        password: testUser.password,
        scope: 'openid profile email'
      });
    });

    it('should handle MFA requirement correctly', async () => {
      // Arrange
      const mfaResponse = {
        requires_mfa: true,
        mfa_token: 'mfa.token'
      };

      mockAuth0Client.passwordGrant.mockResolvedValue(mfaResponse);

      // Act & Assert
      await expect(authService.login({
        ...testUser,
        mfaToken: undefined
      })).rejects.toThrow(new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'MFA token required',
        { requiresMfa: true }
      ));
    });

    it('should handle invalid credentials correctly', async () => {
      // Arrange
      mockAuth0Client.passwordGrant.mockRejectedValue(new Error('Invalid credentials'));

      // Act & Assert
      await expect(authService.login(testUser)).rejects.toThrow(new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        ErrorMessages.AUTHENTICATION_ERROR,
        { originalError: 'Invalid credentials' }
      ));
    });
  });

  describe('validateToken', () => {
    it('should successfully validate a valid token', async () => {
      // Arrange
      const token = sign(mockJwtPayload, process.env.JWT_SECRET!);
      (authService as any).tokenVersions.set(mockJwtPayload.userId, mockJwtPayload.version);

      // Act
      const result = await authService.validateToken(token);

      // Assert
      expect(result).toMatchObject(mockJwtPayload);
    });

    it('should reject expired tokens', async () => {
      // Arrange
      const expiredToken = sign(
        mockJwtPayload,
        process.env.JWT_SECRET!,
        { expiresIn: -1 }
      );

      // Act & Assert
      await expect(authService.validateToken(expiredToken)).rejects.toThrow(new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Invalid token'
      ));
    });

    it('should reject tokens with invalid versions', async () => {
      // Arrange
      const token = sign(mockJwtPayload, process.env.JWT_SECRET!);
      (authService as any).tokenVersions.set(mockJwtPayload.userId, mockJwtPayload.version + 1);

      // Act & Assert
      await expect(authService.validateToken(token)).rejects.toThrow(new AppError(
        ErrorCodes.TOKEN_EXPIRED,
        'Token version is invalid',
        { userId: mockJwtPayload.userId }
      ));
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh a valid token', async () => {
      // Arrange
      const refreshToken = sign(
        { ...mockJwtPayload, type: TokenType.REFRESH },
        process.env.JWT_SECRET!
      );
      (authService as any).tokenVersions.set(mockJwtPayload.userId, mockJwtPayload.version);

      // Act
      const result = await (authService as any).refreshToken(refreshToken);

      // Assert
      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: TokenType.ACCESS
      });
    });

    it('should reject invalid refresh tokens', async () => {
      // Arrange
      const invalidToken = 'invalid.refresh.token';

      // Act & Assert
      await expect((authService as any).refreshToken(invalidToken)).rejects.toThrow(new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Invalid token'
      ));
    });
  });

  describe('verifyMFA', () => {
    it('should successfully verify valid MFA token', async () => {
      // Arrange
      const mfaToken = '123456';
      const expectedToken = 'valid.mfa.token';
      mockAuth0Client.passwordGrant.mockResolvedValue({ access_token: 'token' });

      // Act
      await (authService as any).verifyMfaToken(mfaToken, expectedToken);

      // Assert
      expect(mockAuth0Client.passwordGrant).toHaveBeenCalled();
    });

    it('should reject invalid MFA tokens', async () => {
      // Arrange
      const invalidMfaToken = '000000';
      const expectedToken = 'valid.mfa.token';
      mockAuth0Client.passwordGrant.mockRejectedValue(new Error('Invalid MFA token'));

      // Act & Assert
      await expect((authService as any).verifyMfaToken(invalidMfaToken, expectedToken))
        .rejects.toThrow(new AppError(
          ErrorCodes.AUTHENTICATION_ERROR,
          'Invalid MFA token'
        ));
    });
  });

  describe('logout', () => {
    it('should successfully invalidate user tokens', async () => {
      // Arrange
      const userId = 'test-user-id';
      (authService as any).tokenVersions.set(userId, 1);

      // Act
      await (authService as any).logout(userId);

      // Assert
      expect((authService as any).tokenVersions.get(userId)).toBe(2);
    });
  });
});