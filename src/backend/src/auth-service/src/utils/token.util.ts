/**
 * @fileoverview JWT token utility functions implementing secure token operations
 * using RS256 algorithm with 2048-bit keys and comprehensive security controls.
 * 
 * @version 1.0.0
 * @requires jsonwebtoken@9.0.0
 */

import jwt from 'jsonwebtoken'; // v9.0.0
import { 
  publicKey, 
  privateKey, 
  signOptions, 
  verifyOptions 
} from '../config/jwt.config';
import { 
  TokenPayload, 
  TokenType 
} from '../interfaces/auth.interface';
import { AppError } from '../../../shared/interfaces/error.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorMessages } from '../../../shared/constants/messages';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

/**
 * Token expiration times in seconds with security considerations
 * ACCESS: 1 hour, REFRESH: 7 days
 */
const TOKEN_EXPIRATION = {
  [TokenType.ACCESS]: 3600,
  [TokenType.REFRESH]: 604800
} as const;

/**
 * Generates a secure JWT token with enhanced payload validation and type-specific configurations
 * 
 * @param payload - Token payload containing user information
 * @param type - Type of token to generate (ACCESS or REFRESH)
 * @returns Promise<string> Generated JWT token
 * @throws AppError if token generation fails
 */
export const generateToken = async (
  payload: TokenPayload,
  type: TokenType
): Promise<string> => {
  try {
    // Validate required payload fields
    if (!payload.userId || !payload.email || !payload.roles) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid token payload'
      );
    }

    // Generate unique token ID for tracking
    const tokenId = uuidv4();

    // Prepare token-specific options
    const tokenOptions = {
      ...signOptions,
      expiresIn: TOKEN_EXPIRATION[type],
      jwtid: tokenId,
      subject: payload.userId,
      audience: type === TokenType.REFRESH ? 'refresh' : signOptions.audience
    };

    // Add security claims to payload
    const enhancedPayload = {
      ...payload,
      tokenId,
      type,
      iat: Math.floor(Date.now() / 1000),
      version: process.env.JWT_KEY_VERSION || 'v1'
    };

    // Sign token with RS256 and private key
    return jwt.sign(enhancedPayload, privateKey, tokenOptions);
  } catch (error) {
    throw new AppError(
      ErrorCodes.AUTHENTICATION_ERROR,
      'Token generation failed',
      { originalError: error.message }
    );
  }
};

/**
 * Verifies and decodes JWT tokens with comprehensive security checks
 * 
 * @param token - JWT token string to verify
 * @returns Promise<TokenPayload> Verified token payload
 * @throws AppError if token verification fails
 */
export const verifyToken = async (token: string): Promise<TokenPayload> => {
  try {
    // Basic token format validation
    if (!token || typeof token !== 'string' || !token.startsWith('Bearer ')) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Invalid token format'
      );
    }

    // Extract token from Bearer string
    const tokenString = token.split(' ')[1];

    // Verify token signature and claims
    const decoded = jwt.verify(
      tokenString,
      publicKey,
      verifyOptions
    ) as TokenPayload & jwt.JwtPayload;

    // Validate payload structure
    if (!decoded.userId || !decoded.email || !decoded.roles || !decoded.tokenId) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Invalid token payload structure'
      );
    }

    // Validate token version
    if (decoded.version !== process.env.JWT_KEY_VERSION) {
      throw new AppError(
        ErrorCodes.TOKEN_EXPIRED,
        'Token version is outdated'
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(
        ErrorCodes.TOKEN_EXPIRED,
        ErrorMessages.TOKEN_EXPIRED
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Invalid token'
      );
    }
    throw new AppError(
      ErrorCodes.AUTHENTICATION_ERROR,
      'Token verification failed',
      { originalError: error.message }
    );
  }
};

/**
 * Securely generates new access token using valid refresh token
 * 
 * @param refreshToken - Valid refresh token
 * @returns Promise<string> New access token
 * @throws AppError if token refresh fails
 */
export const refreshToken = async (refreshToken: string): Promise<string> => {
  try {
    // Verify refresh token
    const decoded = await verifyToken(refreshToken);

    // Validate token type
    if (decoded.type !== TokenType.REFRESH) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Invalid token type for refresh'
      );
    }

    // Generate new access token
    const newPayload: TokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
      provider: decoded.provider
    };

    return generateToken(newPayload, TokenType.ACCESS);
  } catch (error) {
    throw new AppError(
      ErrorCodes.AUTHENTICATION_ERROR,
      'Token refresh failed',
      { originalError: error.message }
    );
  }
};