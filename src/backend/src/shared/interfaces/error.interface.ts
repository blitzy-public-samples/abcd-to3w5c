/**
 * @fileoverview Defines standardized error interfaces and types used across all microservices
 * in the habit tracking application. Provides consistent error handling structures that combine
 * error codes, messages, and additional error details.
 * 
 * @version 1.0.0
 */

import { BaseResponse } from '../interfaces/base.interface';
import { ErrorCodes } from '../constants/error-codes';
import { ErrorMessages } from '../constants/messages';

/**
 * Type definition for error details with flexible structure
 * Allows additional context to be passed with errors
 */
export type ErrorDetails = Record<string, unknown>;

/**
 * Custom error class that extends the native Error class
 * Provides standardized error handling across the application
 */
export class AppError extends Error {
  readonly code: ErrorCodes;
  readonly details: ErrorDetails;

  /**
   * Creates a new AppError instance
   * @param code - Error code from ErrorCodes enum
   * @param message - Error message string
   * @param details - Additional error context
   */
  constructor(
    code: ErrorCodes,
    message: string = ErrorMessages.SYSTEM_ERROR,
    details: ErrorDetails = {}
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Interface for standardized error responses
 * Extends BaseResponse to ensure consistent API response structure
 */
export interface ErrorResponse extends BaseResponse {
  readonly success: false;
  readonly code: ErrorCodes;
  readonly message: string;
  readonly details: ErrorDetails;
  readonly timestamp: Date;
}

/**
 * Interface for validation error details
 * Used to provide field-level validation error information
 */
export interface ValidationError {
  /** Name of the field that failed validation */
  readonly field: string;

  /** Validation error message */
  readonly message: string;

  /** Invalid value that caused the validation error */
  readonly value: any;
}

/**
 * Type guard to check if an error is an AppError instance
 * @param error - Error to check
 * @returns boolean indicating if error is AppError
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

/**
 * Type guard to check if an object is a ValidationError
 * @param obj - Object to check
 * @returns boolean indicating if object is ValidationError
 */
export const isValidationError = (obj: unknown): obj is ValidationError => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'field' in obj &&
    'message' in obj &&
    'value' in obj
  );
};

/**
 * Creates a standardized error response object
 * @param error - AppError or Error instance
 * @returns ErrorResponse object
 */
export const createErrorResponse = (error: AppError | Error): ErrorResponse => {
  if (isAppError(error)) {
    return {
      success: false,
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date()
    };
  }

  return {
    success: false,
    code: ErrorCodes.SYSTEM_ERROR,
    message: ErrorMessages.SYSTEM_ERROR,
    details: { originalError: error.message },
    timestamp: new Date()
  };
};