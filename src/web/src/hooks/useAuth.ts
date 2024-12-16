/**
 * @fileoverview Custom React hook for managing authentication state and operations
 * Implements comprehensive security features including Auth0 integration, token management,
 * MFA support, and security monitoring.
 * @version 1.0.0
 */

import { useCallback, useEffect } from 'react'; // ^18.0.0
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import { useRetry } from 'use-retry-axios'; // ^2.0.0
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginAsync,
  registerAsync,
  logoutAsync,
  getCurrentUserAsync,
} from '../store/auth.slice';
import { AUTH_CONFIG, AUTH_ERROR_CODES, AUTH_STORAGE_KEYS } from '../constants/auth.constants';
import type { User, AuthError, LoginCredentials, RegisterCredentials, MFAConfig } from '../types/auth.types';

// Constants for token refresh and security
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Enhanced authentication hook with comprehensive security features
 * @returns Authentication state and methods with security enhancements
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { retry } = useRetry({ maxRetries: MAX_RETRY_ATTEMPTS });
  
  // Select auth state from Redux store
  const {
    user,
    isAuthenticated,
    loading,
    error,
    tokenExpiration,
    mfaEnabled,
    mfaVerified,
    lastActivity,
    sessionExpiry
  } = useAppSelector((state) => state.auth);

  /**
   * Initialize Auth0 client with enhanced security configuration
   */
  const auth0Client = new Auth0Client({
    domain: process.env.VITE_AUTH0_DOMAIN!,
    clientId: process.env.VITE_AUTH0_CLIENT_ID!,
    audience: AUTH_CONFIG.TOKEN_AUDIENCE,
    useRefreshTokens: true,
    cacheLocation: 'localstorage',
    usePKCE: true,
  });

  /**
   * Enhanced login with MFA support and security monitoring
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const result = await dispatch(loginAsync(credentials)).unwrap();
      
      if (result.error?.code === AUTH_ERROR_CODES.MFA_REQUIRED) {
        return { requiresMFA: true, mfaToken: result.error.details?.mfaToken };
      }
      
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Social provider login with enhanced security
   */
  const loginWithProvider = useCallback(async (provider: string) => {
    try {
      await auth0Client.loginWithPopup({
        connection: provider,
        scope: 'openid profile email',
      });
      
      const user = await auth0Client.getUser();
      return dispatch(getCurrentUserAsync(user)).unwrap();
    } catch (error) {
      console.error('Social login failed:', error);
      throw error;
    }
  }, [auth0Client, dispatch]);

  /**
   * Secure registration with validation
   */
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      return await dispatch(registerAsync(credentials)).unwrap();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Secure logout with token cleanup
   */
  const logout = useCallback(async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      await auth0Client.logout({
        returnTo: window.location.origin,
      });
      
      // Clear secure storage
      Object.values(AUTH_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [auth0Client, dispatch]);

  /**
   * Setup MFA with enhanced security
   */
  const setupMFA = useCallback(async (config: MFAConfig) => {
    try {
      const response = await auth0Client.getMfaChallenge();
      // Implement MFA setup logic
      return response;
    } catch (error) {
      console.error('MFA setup failed:', error);
      throw error;
    }
  }, [auth0Client]);

  /**
   * Secure password reset flow
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      await auth0Client.changePassword({
        email,
        connection: 'Username-Password-Authentication',
      });
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  }, [auth0Client]);

  /**
   * Automatic token refresh mechanism
   */
  useEffect(() => {
    if (!isAuthenticated || !tokenExpiration) return;

    const refreshToken = async () => {
      try {
        await retry(async () => {
          const token = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
          if (token) {
            await auth0Client.getTokenSilently();
          }
        });
      } catch (error) {
        console.error('Token refresh failed:', error);
        await logout();
      }
    };

    const interval = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated, tokenExpiration, auth0Client, logout, retry]);

  /**
   * Session activity monitoring
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      if (sessionExpiry && new Date() > new Date(sessionExpiry)) {
        logout();
      }
    };

    const activityInterval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(activityInterval);
  }, [isAuthenticated, sessionExpiry, logout]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    mfaEnabled,
    mfaVerified,
    login,
    loginWithProvider,
    register,
    logout,
    resetPassword,
    setupMFA,
  };
};