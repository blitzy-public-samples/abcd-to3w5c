// @auth0/auth0-spa-js version: ^2.1.0
import { Auth0UserProfile } from '@auth0/auth0-spa-js';

/**
 * Enum for supported authentication providers
 * Extensible for future provider integrations
 */
export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK'
}

/**
 * Enum for different types of authentication tokens
 * Includes support for MFA and password reset flows
 */
export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
  RESET_PASSWORD = 'RESET_PASSWORD',
  MFA = 'MFA'
}

/**
 * Comprehensive type for authentication error handling
 * Includes detailed error information and optional metadata
 */
export type AuthError = {
  code: string;
  message: string;
  details?: Record<string, any>;
};

/**
 * Type for defining authentication token scopes and permissions
 * Readonly to prevent runtime modifications
 */
export type AuthScope = readonly string[];

/**
 * Comprehensive interface representing an authenticated user
 * Includes security features and metadata
 */
export interface User {
  id: string;
  email: string;
  isEmailVerified: boolean;
  auth0Id: string;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  permissions: string[];
  metadata: Record<string, any>;
}

/**
 * Secure interface for user login credentials
 * Supports multiple authentication providers
 */
export interface LoginCredentials {
  email: string;
  password: string;
  provider: AuthProvider;
  rememberMe: boolean;
}

/**
 * Interface for secure user registration with validation
 * Includes terms acceptance requirement
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  provider: AuthProvider;
  acceptTerms: boolean;
}

/**
 * Comprehensive interface for authentication state management
 * Includes loading and error states
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: AuthError | null;
  tokenExpiration: Date | null;
}

/**
 * Secure interface for JWT token management
 * Implements industry standard token attributes
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
}

/**
 * Interface for authentication API responses
 * Includes comprehensive error handling
 */
export interface AuthResponse {
  success: boolean;
  token: AuthToken;
  user: User;
  error: AuthError | null;
  message: string | null;
}

/**
 * Type guard to check if a user has required permissions
 */
export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Type guard to check if a user has required roles
 */
export function hasRole(user: User, role: string): boolean {
  return user.roles.includes(role);
}

/**
 * Type for mapping Auth0 profile to internal user structure
 */
export interface Auth0UserMapping {
  auth0Profile: Auth0UserProfile;
  user: User;
}

/**
 * Type for token validation response
 */
export interface TokenValidation {
  isValid: boolean;
  expiresAt: Date | null;
  error?: AuthError;
}

/**
 * Type for authentication configuration
 */
export interface AuthConfig {
  auth0Domain: string;
  clientId: string;
  audience: string;
  scope: string;
  redirectUri: string;
}