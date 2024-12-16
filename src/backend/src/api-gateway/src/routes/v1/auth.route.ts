/**
 * @fileoverview Authentication router for API Gateway implementing secure JWT-based
 * authentication with Auth0 integration, comprehensive validation, and performance
 * optimization through caching.
 * 
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v6.0.0
import { validate } from '../../middleware/validation.middleware';
import { authenticateToken } from '../../middleware/auth.middleware';
import { LoginCredentials, RegisterCredentials, AuthProvider } from '../../../../auth-service/src/interfaces/auth.interface';
import { createErrorResponse, createSuccessResponse } from '../../../../shared/utils/response.util';
import { ErrorCodes } from '../../../../shared/constants/error-codes';
import { ErrorMessages, SuccessMessages } from '../../../../shared/constants/messages';

// Initialize router
const router = express.Router();

// Rate limiting configurations
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many registration attempts, please try again later'
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window
  message: 'Too many login attempts, please try again later'
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  message: 'Too many refresh attempts, please try again later'
});

/**
 * Registration validation schema
 */
const registerSchema = {
  email: {
    type: 'string',
    required: true,
    format: 'email'
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
  },
  confirmPassword: {
    type: 'string',
    required: true,
    equals: 'password'
  }
};

/**
 * Login validation schema
 */
const loginSchema = {
  email: {
    type: 'string',
    required: true,
    format: 'email'
  },
  password: {
    type: 'string',
    required: true
  },
  mfaToken: {
    type: 'string',
    required: false
  }
};

/**
 * POST /api/v1/auth/register
 * Handles user registration with enhanced validation and security checks
 */
router.post('/register',
  registerLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credentials: RegisterCredentials = {
        ...req.body,
        provider: AuthProvider.EMAIL
      };

      // Forward request to auth service
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return res.status(201).json(createSuccessResponse(data, SuccessMessages.PROFILE_UPDATED));
    } catch (error) {
      next(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        error instanceof Error ? error.message : ErrorMessages.AUTHENTICATION_ERROR
      ));
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Handles user login with MFA support and enhanced security
 */
router.post('/login',
  loginLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credentials: LoginCredentials = {
        ...req.body,
        provider: AuthProvider.EMAIL
      };

      // Forward request to auth service
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Set secure HTTP-only cookie with refresh token
      res.cookie('refreshToken', data.token.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json(createSuccessResponse({
        accessToken: data.token.accessToken,
        user: data.user
      }));
    } catch (error) {
      next(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        error instanceof Error ? error.message : ErrorMessages.AUTHENTICATION_ERROR
      ));
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * Handles token refresh with enhanced caching and validation
 */
router.post('/refresh',
  refreshLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }

      // Forward request to auth service
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      // Update refresh token cookie
      res.cookie('refreshToken', data.token.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json(createSuccessResponse({
        accessToken: data.token.accessToken
      }));
    } catch (error) {
      next(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        error instanceof Error ? error.message : ErrorMessages.AUTHENTICATION_ERROR
      ));
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Handles user logout with token invalidation
 */
router.post('/logout',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Forward request to auth service
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Logout failed');
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      return res.json(createSuccessResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      next(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        error instanceof Error ? error.message : ErrorMessages.AUTHENTICATION_ERROR
      ));
    }
  }
);

export default router;