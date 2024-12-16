/**
 * @fileoverview Core authentication and authorization interfaces for the auth service.
 * Implements comprehensive interfaces for JWT-based authentication with Auth0 integration,
 * including support for multiple authentication providers and enhanced security features.
 * 
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';
import { ErrorResponse } from '../../../shared/interfaces/error.interface';
import { JwtPayload } from 'jsonwebtoken'; // v9.0.0
import { Auth0UserProfile } from 'auth0'; // v3.3.0

/**
 * Enum for supported authentication providers
 * Ensures type safety when handling different authentication methods
 */
export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK'
}

/**
 * Enum for different types of authentication tokens
 * Supports various token use cases with strict type checking
 */
export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  RESET_PASSWORD = 'RESET_PASSWORD'
}

/**
 * Interface for user login credentials with enhanced security features
 * Supports multi-factor authentication and multiple providers
 */
export interface UserCredentials {
  /** User's email address - must be validated */
  email: string;
  
  /** User's password - must meet security requirements */
  password: string;
  
  /** Authentication provider type */
  provider: AuthProvider;
  
  /** Optional MFA token for two-factor authentication */
  mfaToken?: string;
}

/**
 * Interface for authentication tokens with comprehensive token management
 * Implements secure token handling with expiration control
 */
export interface AuthToken {
  /** JWT access token for API authentication */
  accessToken: string;
  
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  
  /** Token expiration time in seconds */
  expiresIn: number;
  
  /** Type of authentication token */
  tokenType: TokenType;
}

/**
 * Interface for authentication response with enhanced error handling
 * Provides comprehensive response structure for auth operations
 */
export interface AuthResponse {
  /** Indicates if authentication was successful */
  success: boolean;
  
  /** Authentication tokens when successful */
  token: AuthToken;
  
  /** User profile data */
  user: UserProfile;
  
  /** Error details when authentication fails */
  error?: ErrorResponse;
}

/**
 * Interface for user profile with extended security features
 * Implements comprehensive user data management with audit fields
 */
export interface UserProfile extends BaseEntity {
  /** User's email address */
  email: string;
  
  /** Email verification status */
  isEmailVerified: boolean;
  
  /** Auth0 user identifier */
  auth0Id: string;
  
  /** Timestamp of last successful login */
  lastLoginAt: Date;
  
  /** User's assigned roles for RBAC */
  roles: string[];
  
  /** MFA enablement status */
  mfaEnabled: boolean;
  
  /** Authentication provider used */
  provider: AuthProvider;
}

/**
 * Interface for JWT token payload with RBAC support
 * Extends standard JWT payload with application-specific claims
 */
export interface TokenPayload extends JwtPayload {
  /** Internal user identifier */
  userId: string;
  
  /** User's email address */
  email: string;
  
  /** User's roles for authorization */
  roles: string[];
  
  /** Authentication provider used */
  provider: AuthProvider;
}

/**
 * Type guard to check if a value is a valid AuthProvider
 * @param value - The value to check
 */
export const isAuthProvider = (value: any): value is AuthProvider => {
  return Object.values(AuthProvider).includes(value);
};

/**
 * Type guard to check if a value is a valid TokenType
 * @param value - The value to check
 */
export const isTokenType = (value: any): value is TokenType => {
  return Object.values(TokenType).includes(value);
};