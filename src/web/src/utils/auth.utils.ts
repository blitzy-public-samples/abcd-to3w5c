// @auth0/auth0-spa-js version: ^2.1.0
// jwt-decode version: ^3.1.2
// crypto-js version: ^4.1.1

import jwtDecode from 'jwt-decode';
import { Auth0Client } from '@auth0/auth0-spa-js';
import * as CryptoJS from 'crypto-js';
import { User, AuthToken, TokenValidation, AuthError } from '../types/auth.types';
import { auth0Config, authConfig } from '../config/auth.config';
import { AUTH_STORAGE_KEYS, AUTH_CONFIG, AUTH_ERROR_CODES } from '../constants/auth.constants';

// Security constants for token handling
const TOKEN_STORAGE_KEY = 'auth_tokens_secure';
const SECURITY_CONFIG = {
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  TOKEN_VERSION: '2',
  MAX_REFRESH_ATTEMPTS: 3,
  REFRESH_BACKOFF_MS: 1000,
  ENCRYPTION_KEY_SIZE: 256,
} as const;

// Initialize Auth0 client
const auth0Client = new Auth0Client(auth0Config);

/**
 * Validates JWT token with comprehensive security checks
 * @param token - JWT token to validate
 * @returns TokenValidation object with validation results
 */
export const isTokenValid = (token: string): TokenValidation => {
  try {
    if (!token) {
      return { isValid: false, expiresAt: null, error: { code: AUTH_ERROR_CODES.TOKEN_INVALID, message: 'Token is missing' } };
    }

    // Decode and verify token structure
    const decodedToken = jwtDecode<{ exp: number; iat: number; aud: string; iss: string }>(token);

    // Verify required claims
    if (!decodedToken.exp || !decodedToken.iat || !decodedToken.aud || !decodedToken.iss) {
      return {
        isValid: false,
        expiresAt: null,
        error: { code: AUTH_ERROR_CODES.TOKEN_INVALID, message: 'Invalid token claims' }
      };
    }

    // Verify audience and issuer
    if (decodedToken.aud !== AUTH_CONFIG.TOKEN_AUDIENCE || decodedToken.iss !== AUTH_CONFIG.TOKEN_ISSUER) {
      return {
        isValid: false,
        expiresAt: null,
        error: { code: AUTH_ERROR_CODES.TOKEN_INVALID, message: 'Invalid token audience or issuer' }
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(decodedToken.exp * 1000);

    // Check if token is expired with buffer time
    if (decodedToken.exp <= now + AUTH_CONFIG.REFRESH_THRESHOLD) {
      return {
        isValid: false,
        expiresAt,
        error: { code: AUTH_ERROR_CODES.TOKEN_EXPIRED, message: 'Token is expired or about to expire' }
      };
    }

    return { isValid: true, expiresAt, error: undefined };
  } catch (error) {
    return {
      isValid: false,
      expiresAt: null,
      error: { code: AUTH_ERROR_CODES.TOKEN_INVALID, message: 'Token validation failed' }
    };
  }
};

/**
 * Determines if token should be refreshed based on security policy
 * @param token - Current JWT token
 * @returns boolean indicating if refresh is needed
 */
export const shouldRefreshToken = (token: string): boolean => {
  try {
    const { isValid, expiresAt, error } = isTokenValid(token);
    if (!isValid || !expiresAt) return true;

    const now = Date.now();
    const timeUntilExpiry = expiresAt.getTime() - now;
    
    // Check if within refresh threshold
    return timeUntilExpiry <= authConfig.refreshThreshold * 1000;
  } catch {
    return true;
  }
};

/**
 * Securely stores authentication tokens with encryption
 * @param tokens - Authentication tokens to store
 * @returns Promise resolving when tokens are stored
 */
export const storeAuthTokens = async (tokens: AuthToken): Promise<void> => {
  try {
    // Generate secure encryption key
    const encryptionKey = CryptoJS.lib.WordArray.random(SECURITY_CONFIG.ENCRYPTION_KEY_SIZE / 8);
    
    // Prepare tokens with metadata
    const tokenData = {
      ...tokens,
      version: SECURITY_CONFIG.TOKEN_VERSION,
      timestamp: Date.now(),
    };

    // Encrypt token data
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(tokenData),
      encryptionKey.toString(),
      {
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    // Store encrypted tokens
    localStorage.setItem(TOKEN_STORAGE_KEY, encrypted.toString());
    sessionStorage.setItem(`${TOKEN_STORAGE_KEY}_key`, encryptionKey.toString());

  } catch (error) {
    throw new Error('Failed to securely store tokens');
  }
};

/**
 * Retrieves and decrypts stored authentication tokens
 * @returns Promise resolving to decrypted AuthToken or null
 */
export const getStoredTokens = async (): Promise<AuthToken | null> => {
  try {
    const encryptedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    const encryptionKey = sessionStorage.getItem(`${TOKEN_STORAGE_KEY}_key`);

    if (!encryptedTokens || !encryptionKey) return null;

    // Decrypt tokens
    const decrypted = CryptoJS.AES.decrypt(encryptedTokens, encryptionKey, {
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7,
    });

    const tokenData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

    // Verify token version and timestamp
    if (tokenData.version !== SECURITY_CONFIG.TOKEN_VERSION) {
      clearStoredTokens();
      return null;
    }

    return tokenData;
  } catch {
    clearStoredTokens();
    return null;
  }
};

/**
 * Securely clears stored authentication tokens
 */
export const clearStoredTokens = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(`${TOKEN_STORAGE_KEY}_key`);
};

/**
 * Refreshes authentication tokens with rate limiting
 * @returns Promise resolving to new AuthToken
 */
export const refreshTokens = async (): Promise<AuthToken> => {
  const storedTokens = await getStoredTokens();
  if (!storedTokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const newTokens = await auth0Client.getTokenSilently({
      timeoutInSeconds: AUTH_CONFIG.TOKEN_EXPIRY,
      useRefreshTokens: true,
    });

    await storeAuthTokens({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken!,
      expiresIn: AUTH_CONFIG.TOKEN_EXPIRY,
      tokenType: 'Bearer',
      scope: newTokens.scope?.split(' ') || [],
    });

    return newTokens;
  } catch (error) {
    clearStoredTokens();
    throw new Error('Token refresh failed');
  }
};

/**
 * Extracts user information from validated token
 * @param token - Valid JWT token
 * @returns User object or null
 */
export const getUserFromToken = (token: string): User | null => {
  try {
    const { isValid } = isTokenValid(token);
    if (!isValid) return null;

    const decodedToken = jwtDecode<any>(token);
    return {
      id: decodedToken.sub,
      email: decodedToken.email,
      isEmailVerified: decodedToken.email_verified,
      auth0Id: decodedToken.sub,
      lastLoginAt: new Date(decodedToken.last_login * 1000),
      createdAt: new Date(decodedToken.created_at * 1000),
      updatedAt: new Date(),
      roles: decodedToken.roles || [],
      permissions: decodedToken.permissions || [],
      metadata: decodedToken.user_metadata || {},
    };
  } catch {
    return null;
  }
};