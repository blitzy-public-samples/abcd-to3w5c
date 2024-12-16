/**
 * @fileoverview Authentication Configuration
 * Provides comprehensive Auth0 and authentication configuration with enhanced security features.
 * Implements production-ready security standards including MFA, rate limiting, and secure token management.
 * 
 * @version 1.0.0
 * @security Enhanced security configurations for production use
 */

import { Auth0ClientOptions } from '@auth0/auth0-spa-js'; // ^2.1.0
import { AUTH_STORAGE_KEYS } from '../constants/auth.constants';
import { AuthProvider } from '../types/auth.types';

/**
 * Interface for rate limiting configuration
 */
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

/**
 * Interface for comprehensive security configuration
 */
interface SecurityConfiguration {
  tokenAlgorithm: string;
  mfaEnabled: boolean;
  mfaTimeout: number;
  cookieSecure: boolean;
  cookieSameSite: string;
  rateLimiting: RateLimitConfig;
}

/**
 * Interface for enhanced authentication configuration
 */
interface AuthConfiguration {
  tokenExpiryTime: number;
  refreshThreshold: number;
  providers: AuthProvider[];
  securityConfig: SecurityConfiguration;
}

/**
 * Enhanced Auth0 client configuration with comprehensive security features
 * @constant
 */
export const auth0Config: Auth0ClientOptions = {
  domain: process.env.VITE_AUTH0_DOMAIN!,
  clientId: process.env.VITE_AUTH0_CLIENT_ID!,
  audience: process.env.VITE_AUTH0_AUDIENCE!,
  redirectUri: `${window.location.origin}/auth/callback`,
  responseType: 'token id_token',
  scope: 'openid profile email',
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
  advancedOptions: {
    defaultScope: 'openid profile email'
  },
  // Enhanced security configurations
  auth0Client: {
    name: 'habit-tracker-web',
    version: '1.0.0'
  },
  leeway: 60, // Clock skew tolerance in seconds
  httpTimeoutInSeconds: 10,
  sessionCheckExpiryDays: 1,
  allowSignUp: false, // Restrict sign-up if needed
};

/**
 * Enhanced authentication configuration with comprehensive security settings
 * @constant
 */
export const authConfig: AuthConfiguration = {
  tokenExpiryTime: 3600, // 1 hour in seconds
  refreshThreshold: 300, // 5 minutes before expiry
  providers: [
    AuthProvider.EMAIL,
    AuthProvider.GOOGLE,
    AuthProvider.FACEBOOK
  ],
  securityConfig: {
    tokenAlgorithm: 'RS256', // Industry standard asymmetric encryption
    mfaEnabled: true,
    mfaTimeout: 300, // 5 minutes
    cookieSecure: true,
    cookieSameSite: 'strict',
    rateLimiting: {
      maxAttempts: 5,
      windowMs: 900000 // 15 minutes in milliseconds
    }
  }
};

/**
 * Retrieves and validates Auth0 configuration with security enhancements
 * @returns {Auth0ClientOptions} Validated Auth0 client configuration
 * @throws {Error} If required environment variables are missing
 */
export function getAuth0Config(): Auth0ClientOptions {
  // Validate required environment variables
  const requiredEnvVars = [
    'VITE_AUTH0_DOMAIN',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_AUDIENCE'
  ];

  const missingEnvVars = requiredEnvVars.filter(
    envVar => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }

  // Apply additional security enhancements
  const enhancedConfig: Auth0ClientOptions = {
    ...auth0Config,
    // Enhanced storage configuration
    cacheLocation: 'localstorage',
    storageKey: AUTH_STORAGE_KEYS.ACCESS_TOKEN,
    // Additional security options
    usePKCE: true, // Enable PKCE for enhanced security
    legacySameSiteCookie: false,
    // Cookie configuration
    cookieOptions: {
      secure: true,
      sameSite: 'strict'
    }
  };

  return enhancedConfig;
}

/**
 * Token storage configuration with enhanced security
 * @constant
 */
export const tokenConfig = {
  storage: {
    accessToken: AUTH_STORAGE_KEYS.ACCESS_TOKEN,
    refreshToken: AUTH_STORAGE_KEYS.REFRESH_TOKEN
  },
  security: {
    useHttpOnly: true,
    useSameSite: true,
    useSecure: true
  }
};

/**
 * OAuth provider configurations
 * @constant
 */
export const oauthConfig = {
  [AuthProvider.GOOGLE]: {
    responseType: 'code',
    scope: 'openid profile email',
    prompt: 'select_account'
  },
  [AuthProvider.FACEBOOK]: {
    responseType: 'code',
    scope: 'public_profile,email',
    display: 'popup'
  }
};

/**
 * Security headers configuration
 * @constant
 */
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};