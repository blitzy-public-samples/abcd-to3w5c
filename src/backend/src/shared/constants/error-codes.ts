/**
 * @fileoverview Standardized error codes for the habit tracking application.
 * Provides a centralized enum of error codes used across all microservices
 * for consistent error handling and monitoring.
 * 
 * Error Code Ranges:
 * - Authentication (1000-1999): Identity and access related errors
 * - Authorization (2000-2999): Permission and role related errors
 * - Validation (3000-3999): Input and data validation errors
 * - Business Logic (4000-4999): Application-specific business rule errors
 * - System (5000-5999): Internal system and infrastructure errors
 * - External Services (6000-6999): Third-party service integration errors
 * 
 * @version 1.0.0
 */

/**
 * Standardized error codes enum used across all microservices
 * for consistent error handling and monitoring.
 */
export enum ErrorCodes {
  // Authentication Errors (1000-1999)
  AUTHENTICATION_ERROR = 1001,        // Generic authentication error
  INVALID_CREDENTIALS = 1002,         // Invalid username/password combination
  TOKEN_EXPIRED = 1003,               // JWT or session token has expired

  // Authorization Errors (2000-2999)
  AUTHORIZATION_ERROR = 2001,         // Generic authorization error
  INSUFFICIENT_PERMISSIONS = 2002,     // User lacks required permissions

  // Validation Errors (3000-3999)
  VALIDATION_ERROR = 3001,            // Generic validation error
  INVALID_INPUT = 3002,               // Invalid input format or content

  // Business Logic Errors (4000-4999)
  HABIT_LIMIT_EXCEEDED = 4001,        // User has reached maximum habit limit

  // System Errors (5000-5999)
  SYSTEM_ERROR = 5001,                // Generic system error
  DATABASE_ERROR = 5002,              // Database connection or query error

  // External Service Errors (6000-6999)
  EXTERNAL_SERVICE_ERROR = 6001       // Third-party service integration error
}

/**
 * Type guard to check if a number is a valid ErrorCode
 * @param code - The number to check
 * @returns boolean indicating if the code is a valid ErrorCode
 */
export const isValidErrorCode = (code: number): code is ErrorCodes => {
  return Object.values(ErrorCodes).includes(code);
};

/**
 * Get the error category based on the error code
 * @param code - The error code to categorize
 * @returns string representing the error category
 */
export const getErrorCategory = (code: ErrorCodes): string => {
  if (code >= 1000 && code < 2000) return 'Authentication';
  if (code >= 2000 && code < 3000) return 'Authorization';
  if (code >= 3000 && code < 4000) return 'Validation';
  if (code >= 4000 && code < 5000) return 'Business Logic';
  if (code >= 5000 && code < 6000) return 'System';
  if (code >= 6000 && code < 7000) return 'External Service';
  return 'Unknown';
};

// Default export for convenient importing
export default ErrorCodes;