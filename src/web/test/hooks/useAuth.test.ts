/**
 * @fileoverview Comprehensive test suite for useAuth custom hook
 * Tests authentication flows, token management, MFA, and security features
 * @version 1.0.0
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import { useAuth } from '../../src/hooks/useAuth';
import { renderWithProviders } from '../utils/test-utils';
import { AUTH_ERROR_CODES, AUTH_CONFIG } from '../../src/constants/auth.constants';

// Mock Auth0 client
jest.mock('@auth0/auth0-spa-js');

// Test constants
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  isEmailVerified: true,
  auth0Id: 'auth0|test-user-id',
  lastLoginAt: new Date('2023-01-01T00:00:00Z'),
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  roles: ['user'],
  permissions: ['read:habits'],
  metadata: {}
};

const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test123!@#',
  provider: 'EMAIL',
  rememberMe: true
};

const TEST_MFA_CONFIG = {
  enabled: true,
  method: 'totp',
  code: '123456'
};

describe('useAuth Hook', () => {
  let mockAuth0Client: jest.Mocked<Auth0Client>;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup Auth0 client mock
    mockAuth0Client = {
      loginWithCredentials: jest.fn(),
      getUser: jest.fn(),
      logout: jest.fn(),
      getTokenSilently: jest.fn(),
      getMfaChallenge: jest.fn(),
      changePassword: jest.fn()
    } as unknown as jest.Mocked<Auth0Client>;
    
    (Auth0Client as jest.Mock).mockImplementation(() => mockAuth0Client);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBeFalsy();
    expect(result.current.loading).toBeFalsy();
    expect(result.current.error).toBeNull();
    expect(result.current.mfaEnabled).toBeFalsy();
    expect(result.current.mfaVerified).toBeFalsy();
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      // Mock successful login response
      mockAuth0Client.loginWithCredentials.mockResolvedValueOnce({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: TEST_USER
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
      });

      expect(result.current.isAuthenticated).toBeTruthy();
      expect(result.current.user).toEqual(TEST_USER);
      expect(result.current.error).toBeNull();
      expect(localStorage.getItem('auth_access_token')).toBeTruthy();
    });

    it('should handle login failure with invalid credentials', async () => {
      // Mock login failure
      mockAuth0Client.loginWithCredentials.mockRejectedValueOnce({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials'
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        try {
          await result.current.login(TEST_CREDENTIALS);
        } catch (error) {
          expect(error.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
        }
      });

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.error).toBeTruthy();
      expect(localStorage.getItem('auth_access_token')).toBeFalsy();
    });

    it('should handle rate limiting', async () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < AUTH_CONFIG.LOGIN_RATE_LIMIT + 1; i++) {
        mockAuth0Client.loginWithCredentials.mockRejectedValueOnce({
          code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid credentials'
        });

        const { result } = renderHook(() => useAuth(), {
          wrapper: ({ children }) => renderWithProviders(children)
        });

        await act(async () => {
          try {
            await result.current.login(TEST_CREDENTIALS);
          } catch (error) {
            if (i === AUTH_CONFIG.LOGIN_RATE_LIMIT) {
              expect(error.code).toBe(AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED);
            }
          }
        });
      }
    });
  });

  describe('MFA Flow', () => {
    it('should handle MFA challenge correctly', async () => {
      // Mock MFA required response
      mockAuth0Client.loginWithCredentials.mockResolvedValueOnce({
        mfa_required: true,
        mfa_token: 'test-mfa-token'
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        const loginResult = await result.current.login(TEST_CREDENTIALS);
        expect(loginResult.requiresMFA).toBeTruthy();
        expect(loginResult.mfaToken).toBeTruthy();
      });

      expect(result.current.mfaEnabled).toBeTruthy();
      expect(result.current.mfaVerified).toBeFalsy();
    });

    it('should complete MFA verification successfully', async () => {
      // Mock MFA verification
      mockAuth0Client.getMfaChallenge.mockResolvedValueOnce({
        success: true,
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token'
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.setupMFA(TEST_MFA_CONFIG);
      });

      expect(result.current.mfaVerified).toBeTruthy();
      expect(result.current.error).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should handle token refresh correctly', async () => {
      // Mock initial login
      mockAuth0Client.loginWithCredentials.mockResolvedValueOnce({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 1 // Short expiry for testing
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
      });

      // Mock token refresh
      mockAuth0Client.getTokenSilently.mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      });

      // Wait for automatic refresh
      await waitFor(() => {
        expect(mockAuth0Client.getTokenSilently).toHaveBeenCalled();
        expect(localStorage.getItem('auth_access_token')).toContain('new-access-token');
      });
    });

    it('should handle token refresh failure', async () => {
      mockAuth0Client.getTokenSilently.mockRejectedValueOnce({
        code: AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
        message: 'Refresh token expired'
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      await act(async () => {
        try {
          await result.current.login(TEST_CREDENTIALS);
        } catch (error) {
          expect(error.code).toBe(AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED);
        }
      });

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(localStorage.getItem('auth_access_token')).toBeFalsy();
    });
  });

  describe('Logout Flow', () => {
    it('should handle logout correctly', async () => {
      // Setup authenticated state
      mockAuth0Client.loginWithCredentials.mockResolvedValueOnce({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: TEST_USER
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      // Login first
      await act(async () => {
        await result.current.login(TEST_CREDENTIALS);
      });

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBeFalsy();
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('auth_access_token')).toBeFalsy();
      expect(localStorage.getItem('auth_refresh_token')).toBeFalsy();
      expect(mockAuth0Client.logout).toHaveBeenCalled();
    });
  });

  describe('Security Events', () => {
    it('should log security events correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => renderWithProviders(children)
      });

      // Mock failed login attempt
      mockAuth0Client.loginWithCredentials.mockRejectedValueOnce({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials'
      });

      await act(async () => {
        try {
          await result.current.login(TEST_CREDENTIALS);
        } catch (error) {
          expect(error.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
        }
      });

      // Verify security log in Redux store
      const state = result.current.store?.getState();
      expect(state.auth.securityLog).toContainEqual(
        expect.objectContaining({
          event: 'Login failed',
          timestamp: expect.any(String)
        })
      );
    });
  });
});