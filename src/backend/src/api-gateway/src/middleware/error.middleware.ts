/**
 * @fileoverview Express middleware for centralized error handling in the API Gateway.
 * Implements comprehensive error processing, standardized response formatting,
 * and advanced logging with security and performance considerations.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.x
import { AppError } from '../../../shared/interfaces/error.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { logger } from '../../../shared/utils/logger.util';
import { createErrorResponse } from '../../../shared/utils/response.util';

/**
 * Maps HTTP status codes to error code ranges
 */
const ERROR_STATUS_MAP = new Map<number, number>([
  [ErrorCodes.AUTHENTICATION_ERROR, 401],
  [ErrorCodes.INVALID_CREDENTIALS, 401],
  [ErrorCodes.TOKEN_EXPIRED, 401],
  [ErrorCodes.AUTHORIZATION_ERROR, 403],
  [ErrorCodes.INSUFFICIENT_PERMISSIONS, 403],
  [ErrorCodes.VALIDATION_ERROR, 400],
  [ErrorCodes.INVALID_INPUT, 400],
  [ErrorCodes.HABIT_LIMIT_EXCEEDED, 422],
  [ErrorCodes.SYSTEM_ERROR, 500],
  [ErrorCodes.DATABASE_ERROR, 503],
  [ErrorCodes.EXTERNAL_SERVICE_ERROR, 502]
]);

/**
 * Sensitive data patterns to be filtered from error responses
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /authorization/i,
  /key/i,
  /secret/i,
  /credential/i
];

/**
 * Interface for enhanced error context
 */
interface ErrorContext {
  path: string;
  method: string;
  correlationId: string;
  timestamp: Date;
  userId?: string;
  ip: string;
}

/**
 * Generates a correlation ID for error tracking
 * @returns Unique correlation ID
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Captures request context for error logging
 * @param req - Express request object
 * @returns Error context object
 */
const captureErrorContext = (req: Request): ErrorContext => {
  return {
    path: req.path,
    method: req.method,
    correlationId: generateCorrelationId(),
    timestamp: new Date(),
    userId: req.user?.id,
    ip: req.ip
  };
};

/**
 * Filters sensitive data from error details
 * @param details - Error details object
 * @returns Filtered error details
 */
const filterSensitiveData = (details: Record<string, unknown>): Record<string, unknown> => {
  const filtered = { ...details };
  
  Object.keys(filtered).forEach(key => {
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      delete filtered[key];
    }
  });

  return filtered;
};

/**
 * Determines appropriate HTTP status code for error
 * @param error - Error instance
 * @returns HTTP status code
 */
const getHttpStatus = (error: AppError | Error): number => {
  if (error instanceof AppError) {
    return ERROR_STATUS_MAP.get(error.code) || 500;
  }
  return 500;
};

/**
 * Express error handling middleware
 * Processes all errors with enhanced context capture and security filtering
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Capture error context
  const context = captureErrorContext(req);

  // Initialize performance tracking
  const startTime = process.hrtime();

  try {
    // Determine error type and code
    const isAppError = error instanceof AppError;
    const errorCode = isAppError ? error.code : ErrorCodes.SYSTEM_ERROR;
    const httpStatus = getHttpStatus(error);

    // Filter sensitive data from error details
    const errorDetails = isAppError 
      ? filterSensitiveData(error.details)
      : { message: error.message };

    // Add error context to details
    const enhancedDetails = {
      ...errorDetails,
      correlationId: context.correlationId,
      path: context.path,
      timestamp: context.timestamp
    };

    // Create standardized error response
    const errorResponse = createErrorResponse(
      errorCode,
      error.message,
      enhancedDetails
    );

    // Log error with enhanced context
    logger.error('API Gateway Error', error, {
      ...context,
      errorCode,
      httpStatus,
      stack: error.stack
    });

    // Track security events if applicable
    if (errorCode >= 1000 && errorCode < 3000) {
      logger.security('Security Event Detected', {
        ...context,
        errorCode,
        eventType: 'AUTH_ERROR'
      });
    }

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Calculate and log performance impact
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    logger.performance('Error Handler Execution', duration, {
      correlationId: context.correlationId,
      errorCode
    });

    // Send error response
    res.status(httpStatus).json(errorResponse);
  } catch (handlerError) {
    // Fallback error handling if error processing fails
    logger.error('Error Handler Failed', handlerError as Error, context);
    
    res.status(500).json(createErrorResponse(
      ErrorCodes.SYSTEM_ERROR,
      'An unexpected error occurred while processing the error'
    ));
  }
};

export default errorHandler;