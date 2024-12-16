/**
 * @fileoverview Express middleware for centralized error handling across all microservices.
 * Implements comprehensive error processing, logging, and standardized error responses
 * with security-focused sanitization and environment-specific configurations.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';  // v4.x
import { AppError } from '../interfaces/error.interface';
import { createErrorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { ErrorCodes } from '../constants/error-codes';
import { ErrorMessages } from '../constants/messages';

/**
 * Configuration options for error handler middleware
 */
interface ErrorHandlerOptions {
  /** Enable detailed error logging */
  logErrors?: boolean;
  /** Include stack traces in error responses (non-production) */
  includeStackTrace?: boolean;
  /** Current environment (development/staging/production) */
  environment?: string;
  /** Security-related configuration */
  securityOptions?: {
    /** Enable security headers in error responses */
    enableSecurityHeaders?: boolean;
    /** Hide error details in production */
    hideErrorDetails?: boolean;
  };
}

/**
 * Default configuration for error handler
 */
const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  logErrors: true,
  includeStackTrace: false,
  environment: process.env.NODE_ENV || 'development',
  securityOptions: {
    enableSecurityHeaders: true,
    hideErrorDetails: process.env.NODE_ENV === 'production'
  }
};

/**
 * Sanitizes error details to prevent sensitive information leakage
 * @param error - Error object to sanitize
 * @returns Sanitized error details
 */
const sanitizeErrorDetails = (error: Error | AppError): Record<string, unknown> => {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /key/i,
    /secret/i,
    /authorization/i,
    /bearer/i
  ];

  const details: Record<string, unknown> = {
    message: error.message
  };

  if (error instanceof AppError) {
    details.code = error.code;
    details.details = { ...error.details };

    // Remove sensitive information from details
    Object.keys(details.details).forEach(key => {
      if (sensitivePatterns.some(pattern => pattern.test(key))) {
        delete (details.details as Record<string, unknown>)[key];
      }
    });
  }

  return details;
};

/**
 * Adds security headers to error responses
 * @param res - Express response object
 */
const addSecurityHeaders = (res: Response): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
};

/**
 * Maps error types to appropriate HTTP status codes
 * @param error - Error object to map
 * @returns HTTP status code
 */
const getHttpStatusCode = (error: Error | AppError): number => {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCodes.AUTHENTICATION_ERROR:
      case ErrorCodes.INVALID_CREDENTIALS:
      case ErrorCodes.TOKEN_EXPIRED:
        return 401;
      case ErrorCodes.AUTHORIZATION_ERROR:
      case ErrorCodes.INSUFFICIENT_PERMISSIONS:
        return 403;
      case ErrorCodes.VALIDATION_ERROR:
      case ErrorCodes.INVALID_INPUT:
        return 400;
      case ErrorCodes.HABIT_LIMIT_EXCEEDED:
        return 422;
      case ErrorCodes.EXTERNAL_SERVICE_ERROR:
        return 503;
      case ErrorCodes.DATABASE_ERROR:
        return 500;
      default:
        return 500;
    }
  }
  return 500;
};

/**
 * Express error handling middleware factory
 * @param options - Configuration options for error handler
 * @returns Configured error handling middleware
 */
export const errorHandler = (options: ErrorHandlerOptions = DEFAULT_OPTIONS) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // Initialize error tracking context
    const requestId = req.headers['x-request-id'] || 'unknown';
    const timestamp = new Date().toISOString();

    // Log error with appropriate severity
    if (config.logErrors) {
      logger.error('Request error occurred', error, {
        requestId,
        method: req.method,
        path: req.path,
        timestamp,
        ip: req.ip,
        userId: (req as any).user?.id
      });
    }

    // Determine HTTP status code
    const statusCode = getHttpStatusCode(error);

    // Create base error response
    const errorResponse = createErrorResponse(
      error instanceof AppError ? error.code : ErrorCodes.SYSTEM_ERROR,
      error instanceof AppError ? error.message : ErrorMessages.SYSTEM_ERROR,
      sanitizeErrorDetails(error)
    );

    // Add stack trace for non-production environments if enabled
    if (config.includeStackTrace && config.environment !== 'production') {
      errorResponse.details.stack = error.stack;
    }

    // Add security headers if enabled
    if (config.securityOptions?.enableSecurityHeaders) {
      addSecurityHeaders(res);
    }

    // Hide detailed error information in production if configured
    if (config.securityOptions?.hideErrorDetails && config.environment === 'production') {
      delete errorResponse.details;
      if (statusCode === 500) {
        errorResponse.message = ErrorMessages.SYSTEM_ERROR;
      }
    }

    // Track error metrics for monitoring
    logger.performance('Error handler execution', Date.now() - new Date(timestamp).getTime(), {
      statusCode,
      errorCode: errorResponse.code,
      requestId
    });

    // Send error response
    res.status(statusCode).json(errorResponse);
  };
};

/**
 * Type definition for error handling middleware
 */
export type ErrorMiddleware = (
  options?: ErrorHandlerOptions
) => (error: Error, req: Request, res: Response, next: NextFunction) => void;
```

This implementation provides:

1. Comprehensive error handling with proper error code mapping
2. Security-focused error response sanitization
3. Environment-specific error detail control
4. Integration with the logging system for error tracking
5. Security headers for error responses
6. Performance monitoring of error handling
7. Configurable options for different environments
8. Type safety with TypeScript
9. Standardized error response format
10. Protection against sensitive data leakage

The middleware can be used in Express applications like this:

```typescript
import { errorHandler } from './middleware/error-handler';

app.use(errorHandler({
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV !== 'production',
  environment: process.env.NODE_ENV,
  securityOptions: {
    enableSecurityHeaders: true,
    hideErrorDetails: process.env.NODE_ENV === 'production'
  }
}));