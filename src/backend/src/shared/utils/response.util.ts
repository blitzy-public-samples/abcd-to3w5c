/**
 * @fileoverview Utility module providing standardized response formatting functions
 * for consistent API responses across all microservices in the habit tracking application.
 * Implements type-safe success and error response builders with comprehensive error handling.
 * 
 * @version 1.0.0
 */

import { BaseResponse } from '../interfaces/base.interface';
import { ErrorResponse, ErrorDetails } from '../interfaces/error.interface';
import { ErrorCodes, isValidErrorCode, getErrorCategory } from '../constants/error-codes';
import { ErrorMessages, SuccessMessages } from '../constants/messages';

/**
 * Interface for successful API responses with type-safe data
 * @template T - Type of data included in the response
 */
export interface SuccessResponse<T> extends BaseResponse {
  readonly success: true;
  readonly data: T;
  readonly message: string;
  readonly timestamp: Date;
}

/**
 * Creates a standardized success response object with type safety
 * @template T - Type of data to be included in the response
 * @param data - Data to be included in the response
 * @param message - Optional success message
 * @returns Type-safe success response object
 * @throws Error if data is null or undefined
 */
export function createSuccessResponse<T>(
  data: T,
  message?: keyof typeof SuccessMessages | string
): SuccessResponse<T> {
  if (data === null || data === undefined) {
    throw new Error('Response data cannot be null or undefined');
  }

  return {
    success: true,
    data,
    message: message 
      ? (SuccessMessages[message as keyof typeof SuccessMessages] || message)
      : 'Operation completed successfully',
    timestamp: new Date()
  };
}

/**
 * Creates a standardized error response object with proper validation
 * @param code - Error code from ErrorCodes enum
 * @param message - Error message string
 * @param details - Optional error details object
 * @returns Validated error response object
 * @throws Error if error code is invalid
 */
export function createErrorResponse(
  code: ErrorCodes,
  message?: string,
  details: ErrorDetails = {}
): ErrorResponse {
  // Validate error code
  if (!isValidErrorCode(code)) {
    throw new Error(`Invalid error code: ${code}`);
  }

  // Sanitize error details to prevent sensitive data leakage
  const sanitizedDetails = sanitizeErrorDetails(details);

  // Get default message if none provided
  const errorMessage = message || ErrorMessages[getErrorMessageKey(code)];

  return {
    success: false,
    code,
    message: errorMessage,
    details: sanitizedDetails,
    timestamp: new Date()
  };
}

/**
 * Helper function to get the corresponding error message key from error code
 * @param code - Error code from ErrorCodes enum
 * @returns Key for ErrorMessages object
 */
function getErrorMessageKey(code: ErrorCodes): keyof typeof ErrorMessages {
  const category = getErrorCategory(code);
  switch (category) {
    case 'Authentication':
      return 'AUTHENTICATION_ERROR';
    case 'Authorization':
      return 'AUTHORIZATION_ERROR';
    case 'Validation':
      return 'VALIDATION_ERROR';
    case 'Business Logic':
      return 'HABIT_LIMIT_EXCEEDED';
    case 'System':
      return 'SYSTEM_ERROR';
    case 'External Service':
      return 'EXTERNAL_SERVICE_ERROR';
    default:
      return 'SYSTEM_ERROR';
  }
}

/**
 * Sanitizes error details to prevent sensitive data leakage
 * @param details - Raw error details object
 * @returns Sanitized error details
 */
function sanitizeErrorDetails(details: ErrorDetails): ErrorDetails {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...details };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      delete sanitized[key];
    }
  });

  return sanitized;
}

/**
 * Type guard to check if a response is a success response
 * @param response - Response to check
 * @returns boolean indicating if response is a success response
 */
export function isSuccessResponse<T>(
  response: SuccessResponse<T> | ErrorResponse
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error response
 * @param response - Response to check
 * @returns boolean indicating if response is an error response
 */
export function isErrorResponse(
  response: SuccessResponse<unknown> | ErrorResponse
): response is ErrorResponse {
  return response.success === false;
}