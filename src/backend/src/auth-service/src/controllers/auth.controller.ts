/**
 * @fileoverview Enhanced authentication controller implementing secure user authentication,
 * token management, and comprehensive security monitoring with rate limiting and circuit breaking.
 * 
 * @version 1.0.0
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Headers,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common'; // ^9.0.0
import { CircuitBreaker } from '@nestjs/common'; // ^9.0.0
import { RateLimit, RateLimitGuard } from '@nestjs/throttler'; // ^9.0.0
import { GrpcMethod } from '@nestjs/microservices'; // ^9.0.0

import { AuthService } from '../services/auth.service';
import { UserCredentials, AuthResponse, TokenPayload } from '../interfaces/auth.interface';
import { AppError } from '../../../shared/interfaces/error.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorMessages } from '../../../shared/constants/messages';

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;
const TOKEN_VERSION_HEADER = 'X-Token-Version';

/**
 * Enhanced authentication controller with advanced security features
 * Implements secure endpoints for user authentication and token management
 */
@Controller('auth')
@UseGuards(RateLimitGuard)
@UseInterceptors(SecurityHeadersInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Enhanced login endpoint with rate limiting and security monitoring
   * @param credentials - User login credentials
   * @returns Authentication response with tokens
   * @throws {UnauthorizedException} For invalid credentials
   * @throws {BadRequestException} For invalid input
   */
  @Post('login')
  @GrpcMethod('AuthService', 'Login')
  @RateLimit({
    windowMs: LOGIN_WINDOW_MINUTES * 60 * 1000,
    max: MAX_LOGIN_ATTEMPTS,
    message: ErrorMessages.AUTHENTICATION_ERROR
  })
  @CircuitBreaker({
    timeout: 5000,
    maxFailures: 3,
    resetTimeout: 60000
  })
  async login(@Body() credentials: UserCredentials): Promise<AuthResponse> {
    try {
      // Validate input credentials
      this.validateCredentials(credentials);

      // Attempt authentication
      const authResponse = await this.authService.login(credentials);

      // Add security headers to response
      this.addSecurityHeaders(authResponse);

      return authResponse;

    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Enhanced token validation endpoint with version checking
   * @param token - JWT token to validate
   * @param tokenVersion - Token version for validation
   * @returns Token validation response
   * @throws {UnauthorizedException} For invalid tokens
   */
  @Post('validate')
  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    @Headers('Authorization') token: string,
    @Headers(TOKEN_VERSION_HEADER) tokenVersion: string
  ): Promise<TokenPayload> {
    try {
      // Extract token from Authorization header
      const bearerToken = this.extractBearerToken(token);

      // Validate token with version check
      const validatedToken = await this.authService.validateToken(bearerToken);

      // Verify token version matches
      if (tokenVersion && validatedToken.version !== parseInt(tokenVersion, 10)) {
        throw new AppError(
          ErrorCodes.TOKEN_EXPIRED,
          'Token version mismatch',
          { expected: tokenVersion, actual: validatedToken.version }
        );
      }

      return validatedToken;

    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Token refresh endpoint with enhanced security
   * @param refreshToken - Refresh token for generating new access token
   * @returns New authentication tokens
   * @throws {UnauthorizedException} For invalid refresh tokens
   */
  @Post('refresh')
  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(
    @Headers('Authorization') refreshToken: string
  ): Promise<AuthResponse> {
    try {
      const token = this.extractBearerToken(refreshToken);
      return await this.authService.refreshToken(token);
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Logout endpoint for token invalidation
   * @param token - Access token to invalidate
   * @returns Success response
   */
  @Post('logout')
  @GrpcMethod('AuthService', 'Logout')
  async logout(
    @Headers('Authorization') token: string
  ): Promise<{ success: boolean }> {
    try {
      const bearerToken = this.extractBearerToken(token);
      await this.authService.logout(bearerToken);
      return { success: true };
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Validates user credentials format and content
   * @param credentials - User credentials to validate
   * @throws {BadRequestException} For invalid credentials format
   */
  private validateCredentials(credentials: UserCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new BadRequestException(ErrorMessages.INVALID_INPUT);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Password complexity validation
    if (credentials.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
  }

  /**
   * Extracts bearer token from Authorization header
   * @param authHeader - Authorization header value
   * @returns Extracted token
   * @throws {UnauthorizedException} For invalid authorization header
   */
  private extractBearerToken(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header');
    }
    return authHeader.substring(7);
  }

  /**
   * Adds security headers to authentication response
   * @param response - Authentication response
   */
  private addSecurityHeaders(response: AuthResponse): void {
    response.headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
  }

  /**
   * Handles authentication errors with proper error responses
   * @param error - Error to handle
   * @throws {UnauthorizedException} For authentication errors
   * @throws {BadRequestException} For validation errors
   */
  private handleAuthError(error: any): never {
    if (error instanceof AppError) {
      switch (error.code) {
        case ErrorCodes.AUTHENTICATION_ERROR:
        case ErrorCodes.TOKEN_EXPIRED:
          throw new UnauthorizedException(error.message);
        case ErrorCodes.VALIDATION_ERROR:
          throw new BadRequestException(error.message);
        default:
          throw error;
      }
    }
    throw new UnauthorizedException(ErrorMessages.AUTHENTICATION_ERROR);
  }
}

/**
 * Security headers interceptor for enhanced response security
 */
class SecurityHeadersInterceptor {
  intercept(context: any, next: () => Promise<any>) {
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    return next();
  }
}