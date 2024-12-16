/**
 * @fileoverview Auth0 configuration and client setup with enhanced security features
 * Implements comprehensive Auth0 settings for multi-provider authentication support
 * with industry-standard security measures and validation.
 * 
 * @version 1.0.0
 */

import { ManagementClient, AuthenticationClient } from 'auth0'; // v3.3.0
import { validateConfig } from 'auth0-config-validator'; // v1.0.0
import { AuthProvider } from '../interfaces/auth.interface';
import { AppError } from '../../../shared/interfaces/error.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';

/**
 * Interface for provider-specific configuration settings
 */
interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  scope: string[];
  callbackUrl: string;
}

/**
 * Interface for rate limiting configuration
 */
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

/**
 * Interface for security configuration settings
 */
interface SecurityConfig {
  tokenAlgorithm: string;
  tokenExpiration: number;
  mfaEnabled: boolean;
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    requireUppercase: boolean;
    maxAttempts: number;
  };
}

/**
 * Enhanced interface for Auth0 configuration
 */
interface Auth0Configuration {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
  callbackUrl: string;
  providers: Record<AuthProvider, ProviderConfig>;
  securitySettings: SecurityConfig;
  rateLimit: RateLimitConfig;
}

/**
 * Default security configuration
 */
const defaultSecurityConfig: SecurityConfig = {
  tokenAlgorithm: 'RS256',
  tokenExpiration: 3600, // 1 hour
  mfaEnabled: true,
  passwordPolicy: {
    minLength: 12,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUppercase: true,
    maxAttempts: 5
  }
};

/**
 * Default rate limit configuration
 */
const defaultRateLimitConfig: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 60 * 60 * 1000 // 1 hour
};

/**
 * Validates the Auth0 configuration settings
 * @param config - Auth0 configuration object
 * @throws {AppError} If configuration validation fails
 */
const validateAuth0Config = (config: Auth0Configuration): boolean => {
  if (!validateConfig(config)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid Auth0 configuration',
      { config }
    );
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_AUDIENCE'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Missing required environment variable: ${envVar}`
      );
    }
  }

  return true;
};

/**
 * Auth0 configuration object with enhanced security settings
 */
export const auth0Config: Auth0Configuration = {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  audience: process.env.AUTH0_AUDIENCE!,
  callbackUrl: process.env.AUTH0_CALLBACK_URL!,
  providers: {
    [AuthProvider.EMAIL]: {
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      scope: ['openid', 'profile', 'email'],
      callbackUrl: process.env.AUTH0_CALLBACK_URL!
    },
    [AuthProvider.GOOGLE]: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ['openid', 'profile', 'email'],
      callbackUrl: `${process.env.AUTH0_CALLBACK_URL}/google`
    },
    [AuthProvider.FACEBOOK]: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      scope: ['email', 'public_profile'],
      callbackUrl: `${process.env.AUTH0_CALLBACK_URL}/facebook`
    }
  },
  securitySettings: {
    ...defaultSecurityConfig,
    tokenAlgorithm: process.env.AUTH0_TOKEN_ALGORITHM || defaultSecurityConfig.tokenAlgorithm,
    tokenExpiration: Number(process.env.AUTH0_TOKEN_EXPIRATION) || defaultSecurityConfig.tokenExpiration
  },
  rateLimit: defaultRateLimitConfig
};

/**
 * Creates and configures Auth0 client instances with enhanced security
 * @returns Configured Auth0 management and authentication clients
 * @throws {AppError} If client creation fails
 */
export const createAuth0Clients = () => {
  try {
    validateAuth0Config(auth0Config);

    const managementClient = new ManagementClient({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      clientSecret: auth0Config.clientSecret,
      scope: 'read:users update:users delete:users create:users',
      audience: `https://${auth0Config.domain}/api/v2/`,
      tokenProvider: {
        enableCache: true,
        cacheTTLInSeconds: 3600
      }
    });

    const authenticationClient = new AuthenticationClient({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      clientSecret: auth0Config.clientSecret
    });

    return {
      managementClient,
      authenticationClient
    };
  } catch (error) {
    throw new AppError(
      ErrorCodes.AUTHENTICATION_ERROR,
      'Failed to initialize Auth0 clients',
      { originalError: error }
    );
  }
};

// Create and export configured Auth0 clients
export const { managementClient: auth0ManagementClient, authenticationClient: auth0AuthenticationClient } = createAuth0Clients();