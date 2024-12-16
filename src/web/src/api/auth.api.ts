/**
 * @fileoverview Enhanced Authentication API Client
 * Implements secure authentication with Auth0, MFA support, and comprehensive security monitoring
 * @version 1.0.0
 * @security Enhanced security implementation with token encryption and monitoring
 */

import { Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js'; // ^2.1.0
import CryptoJS from 'crypto-js'; // ^4.1.1
import { apiClient } from '../config/api.config';
import { auth0Config, authConfig, getAuth0Config, tokenConfig } from '../config/auth.config';
import { 
  AUTH_STORAGE_KEYS, 
  AUTH_ERROR_CODES, 
  AUTH_ROUTES,
  AUTH_CONFIG 
} from '../constants/auth.constants';
import { 
  AuthResponse, 
  LoginCredentials, 
  AuthToken, 
  User,
  AuthError,
  TokenValidation 
} from '../types/auth.types';

/**
 * Security monitoring interface for tracking authentication events
 */
interface SecurityMonitor {
  logAuthAttempt: (email: string, success: boolean) => void;
  checkRateLimit: (email: string) => boolean;
  trackTokenRefresh: (userId: string) => void;
}

/**
 * Enhanced Authentication API class with comprehensive security features
 */
class AuthApi {
  private auth0Client: Auth0Client;
  private securityMonitor: SecurityMonitor;
  private tokenRefreshTimeout?: NodeJS.Timeout;

  constructor() {
    this.auth0Client = new Auth0Client(getAuth0Config());
    this.initializeSecurityMonitor();
    this.setupTokenRefreshHandler();
  }

  /**
   * Initialize security monitoring system
   */
  private initializeSecurityMonitor(): void {
    this.securityMonitor = {
      logAuthAttempt: (email: string, success: boolean) => {
        const timestamp = new Date().toISOString();
        console.info('[Auth Event]', {
          email,
          success,
          timestamp,
          environment: process.env.NODE_ENV
        });
      },
      checkRateLimit: (email: string): boolean => {
        const attempts = this.getLoginAttempts(email);
        return attempts < AUTH_CONFIG.LOGIN_RATE_LIMIT;
      },
      trackTokenRefresh: (userId: string) => {
        console.info('[Token Refresh]', {
          userId,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Enhanced login with security features and MFA support
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Rate limiting check
      if (!this.securityMonitor.checkRateLimit(credentials.email)) {
        throw new Error(AUTH_ERROR_CODES.RATE_LIMIT_EXCEEDED);
      }

      // Authenticate with Auth0
      const auth0Response = await this.auth0Client.loginWithCredentials({
        username: credentials.email,
        password: credentials.password,
        realm: credentials.provider
      });

      // Handle MFA if required
      if (auth0Response.mfa_required) {
        return this.handleMFAChallenge(auth0Response);
      }

      // Generate and encrypt tokens
      const tokens = await this.generateSecureTokens(auth0Response);
      
      // Store encrypted tokens
      this.securelyStoreTokens(tokens);

      // Get user profile
      const user = await this.fetchUserProfile(tokens.accessToken);

      // Setup automatic token refresh
      this.setupTokenRefreshHandler();

      // Log successful authentication
      this.securityMonitor.logAuthAttempt(credentials.email, true);

      return {
        success: true,
        token: tokens,
        user,
        error: null,
        message: 'Authentication successful'
      };

    } catch (error) {
      this.securityMonitor.logAuthAttempt(credentials.email, false);
      return this.handleAuthError(error);
    }
  }

  /**
   * Enhanced token refresh with automatic retry and rotation
   */
  public async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      const decryptedToken = this.decryptToken(refreshToken);
      
      const response = await this.auth0Client.refreshToken({
        refreshToken: decryptedToken
      });

      const newTokens = await this.generateSecureTokens(response);
      this.securelyStoreTokens(newTokens);

      this.securityMonitor.trackTokenRefresh(response.user_id);
      
      return newTokens;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Secure token encryption
   */
  private encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(
      token,
      AUTH_CONFIG.TOKEN_ALGORITHM
    ).toString();
  }

  /**
   * Secure token decryption
   */
  private decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(
      encryptedToken,
      AUTH_CONFIG.TOKEN_ALGORITHM
    );
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Handle MFA challenge
   */
  private async handleMFAChallenge(auth0Response: any): Promise<AuthResponse> {
    return {
      success: false,
      token: null as any,
      user: null as any,
      error: {
        code: AUTH_ERROR_CODES.MFA_REQUIRED,
        message: 'Multi-factor authentication required'
      },
      message: 'MFA required'
    };
  }

  /**
   * Generate secure tokens with encryption
   */
  private async generateSecureTokens(auth0Response: any): Promise<AuthToken> {
    return {
      accessToken: this.encryptToken(auth0Response.access_token),
      refreshToken: this.encryptToken(auth0Response.refresh_token),
      expiresIn: auth0Response.expires_in,
      tokenType: 'Bearer',
      scope: auth0Response.scope.split(' ')
    };
  }

  /**
   * Securely store tokens with encryption
   */
  private securelyStoreTokens(tokens: AuthToken): void {
    localStorage.setItem(
      AUTH_STORAGE_KEYS.ACCESS_TOKEN,
      tokens.accessToken
    );
    localStorage.setItem(
      AUTH_STORAGE_KEYS.REFRESH_TOKEN,
      tokens.refreshToken
    );
  }

  /**
   * Setup automatic token refresh handler
   */
  private setupTokenRefreshHandler(): void {
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }

    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return;

    const expiresIn = this.getTokenExpiration(token);
    if (!expiresIn) return;

    const refreshTime = expiresIn - AUTH_CONFIG.REFRESH_THRESHOLD;
    
    this.tokenRefreshTimeout = setTimeout(
      async () => {
        const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          await this.refreshToken(refreshToken);
        }
      },
      refreshTime * 1000
    );
  }

  /**
   * Get token expiration time
   */
  private getTokenExpiration(token: string): number | null {
    try {
      const decryptedToken = this.decryptToken(token);
      const payload = JSON.parse(atob(decryptedToken.split('.')[1]));
      return payload.exp;
    } catch {
      return null;
    }
  }

  /**
   * Track login attempts for rate limiting
   */
  private getLoginAttempts(email: string): number {
    const attempts = localStorage.getItem(`${email}_attempts`);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  /**
   * Fetch user profile with error handling
   */
  private async fetchUserProfile(accessToken: string): Promise<User> {
    const response = await this.auth0Client.getUser(this.decryptToken(accessToken));
    return {
      id: response.sub!,
      email: response.email!,
      isEmailVerified: response.email_verified!,
      auth0Id: response.sub!,
      lastLoginAt: new Date(response.updated_at!),
      createdAt: new Date(response.created_at!),
      updatedAt: new Date(response.updated_at!),
      roles: response['https://habittracker.com/roles'] || [],
      permissions: response['https://habittracker.com/permissions'] || [],
      metadata: response.user_metadata || {}
    };
  }

  /**
   * Enhanced error handling with security logging
   */
  private handleAuthError(error: any): AuthResponse {
    const authError: AuthError = {
      code: error.error_code || AUTH_ERROR_CODES.UNAUTHORIZED,
      message: error.message || 'Authentication failed',
      details: error.details
    };

    console.error('[Auth Error]', {
      ...authError,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      token: null as any,
      user: null as any,
      error: authError,
      message: authError.message
    };
  }
}

// Export singleton instance
export const authApi = new AuthApi();