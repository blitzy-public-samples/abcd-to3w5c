/**
 * @fileoverview Authentication Constants
 * Defines comprehensive authentication-related constants including storage keys,
 * token configuration, security parameters, error codes, and authentication states.
 * 
 * @version 1.0.0
 * @security Enhanced security configurations for production use
 */

import { AuthProvider } from '../types/auth.types';

/**
 * Storage keys for secure authentication data management in localStorage
 * Using prefixed naming convention for better security and organization
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  MFA_STATE: 'auth_mfa_state',
  LAST_LOGIN: 'auth_last_login',
} as const;

/**
 * Enhanced authentication configuration with comprehensive security parameters
 * All time values are in seconds
 */
export const AUTH_CONFIG = {
  // Token configuration
  TOKEN_EXPIRY: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY: 604800, // 7 days
  REFRESH_THRESHOLD: 300, // 5 minutes before expiry
  MAX_RETRIES: 3, // Maximum token refresh attempts
  
  // Token security settings
  TOKEN_ALGORITHM: 'RS256', // Industry standard asymmetric encryption
  TOKEN_AUDIENCE: 'https://api.habittracker.com',
  TOKEN_ISSUER: 'https://auth.habittracker.com',
  
  // Cookie security configuration
  SECURE_COOKIE_OPTIONS: {
    httpOnly: true, // Prevents XSS attacks
    secure: true, // HTTPS only
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 3600,
  },
  
  // MFA configuration
  MFA_TIMEOUT: 300, // 5 minutes
  MFA_CODE_LENGTH: 6,
  MFA_MAX_ATTEMPTS: 3,
  
  // Rate limiting
  LOGIN_RATE_LIMIT: 5, // Attempts per minute
  PASSWORD_RESET_RATE_LIMIT: 3, // Attempts per hour
  
  // Provider-specific configurations
  PROVIDERS: {
    [AuthProvider.EMAIL]: {
      requiresVerification: true,
      passwordMinLength: 12,
      passwordRequiresSpecialChar: true,
    },
    [AuthProvider.GOOGLE]: {
      scope: ['profile', 'email'],
      prompt: 'select_account',
    },
    [AuthProvider.FACEBOOK]: {
      scope: ['public_profile', 'email'],
      fields: ['id', 'email', 'name'],
    },
  },
} as const;

/**
 * Comprehensive error codes for authentication failures and security events
 * Using hierarchical structure for better error handling and logging
 */
export const AUTH_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'auth/invalid-credentials',
  TOKEN_EXPIRED: 'auth/token-expired',
  UNAUTHORIZED: 'auth/unauthorized',
  
  // MFA errors
  MFA_REQUIRED: 'auth/mfa-required',
  MFA_INVALID_CODE: 'auth/mfa-invalid-code',
  MFA_EXPIRED: 'auth/mfa-expired',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'auth/rate-limit-exceeded',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  
  // Token errors
  TOKEN_INVALID: 'auth/token-invalid',
  TOKEN_REVOKED: 'auth/token-revoked',
  REFRESH_TOKEN_EXPIRED: 'auth/refresh-token-expired',
  
  // Account errors
  ACCOUNT_DISABLED: 'auth/account-disabled',
  EMAIL_NOT_VERIFIED: 'auth/email-not-verified',
  PASSWORD_RESET_REQUIRED: 'auth/password-reset-required',
  
  // Provider errors
  PROVIDER_ERROR: 'auth/provider-error',
  POPUP_BLOCKED: 'auth/popup-blocked',
  POPUP_CLOSED: 'auth/popup-closed',
} as const;

/**
 * Authentication route paths for navigation and API endpoints
 * Using consistent naming convention for better maintainability
 */
export const AUTH_ROUTES = {
  // Main authentication routes
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  CALLBACK: '/auth/callback',
  
  // MFA routes
  MFA: '/auth/mfa',
  MFA_SETUP: '/auth/mfa/setup',
  MFA_VERIFY: '/auth/mfa/verify',
  
  // Password management
  PASSWORD_RESET: '/auth/reset-password',
  PASSWORD_CHANGE: '/auth/change-password',
  
  // Account management
  VERIFY_EMAIL: '/auth/verify-email',
  PROFILE: '/auth/profile',
  
  // OAuth routes
  GOOGLE_AUTH: '/auth/google',
  FACEBOOK_AUTH: '/auth/facebook',
  
  // API endpoints
  API: {
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    VERIFY_TOKEN: '/api/v1/auth/verify',
  },
} as const;

/**
 * HTTP headers for authentication
 * Using standard security headers
 */
export const AUTH_HEADERS = {
  AUTHORIZATION: 'Authorization',
  REFRESH_TOKEN: 'X-Refresh-Token',
  CLIENT_ID: 'X-Client-ID',
  DEVICE_ID: 'X-Device-ID',
} as const;

/**
 * Authentication state constants
 * Used for managing authentication flow
 */
export const AUTH_STATES = {
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  MFA_REQUIRED: 'mfa_required',
  PASSWORD_RESET_REQUIRED: 'password_reset_required',
  EMAIL_VERIFICATION_REQUIRED: 'email_verification_required',
} as const;