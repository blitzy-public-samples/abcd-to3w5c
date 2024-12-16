/**
 * @fileoverview Standardized message constants used across all microservices
 * in the habit tracking application. Provides consistent error messages,
 * success messages, and notification messages that correspond to error codes
 * and system events.
 * 
 * @version 1.0.0
 */

/**
 * Standardized error messages corresponding to error codes (1000-6999)
 * Used for consistent error handling across the application
 */
export const ErrorMessages = Object.freeze({
  // Authentication Errors (1000-1999)
  AUTHENTICATION_ERROR: 'Authentication failed',
  INVALID_CREDENTIALS: 'Invalid username or password',
  TOKEN_EXPIRED: 'Session expired, please login again',

  // Authorization Errors (2000-2999)
  AUTHORIZATION_ERROR: 'Access denied',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',

  // Validation Errors (3000-3999)
  VALIDATION_ERROR: 'Validation failed',
  INVALID_INPUT: 'Invalid input data provided',

  // Business Logic Errors (4000-4999)
  HABIT_LIMIT_EXCEEDED: 'Maximum habit limit reached',

  // System Errors (5000-5999)
  SYSTEM_ERROR: 'Internal server error occurred',
  DATABASE_ERROR: 'Database operation failed',

  // External Service Errors (6000-6999)
  EXTERNAL_SERVICE_ERROR: 'External service request failed'
} as const);

/**
 * Standardized success messages for successful operations
 * Used to ensure consistent user feedback across the application
 */
export const SuccessMessages = Object.freeze({
  // Habit-related success messages
  HABIT_CREATED: 'Habit created successfully',
  HABIT_UPDATED: 'Habit updated successfully',
  HABIT_DELETED: 'Habit deleted successfully',
  HABIT_COMPLETED: 'Habit marked as completed',

  // User-related success messages
  PROFILE_UPDATED: 'Profile updated successfully',
  SETTINGS_UPDATED: 'Settings updated successfully'
} as const);

/**
 * Standardized notification messages for user alerts and reminders
 * Used to maintain consistent communication across the application
 */
export const NotificationMessages = Object.freeze({
  // Achievement and streak notifications
  STREAK_MILESTONE: 'Congratulations! You\'ve reached a streak milestone',
  HABIT_REMINDER: 'Time to complete your habit',
  ACHIEVEMENT_UNLOCKED: 'New achievement unlocked!',
  STREAK_AT_RISK: 'Your streak is at risk!'
} as const);

// Type definitions for better TypeScript support
export type ErrorMessageKey = keyof typeof ErrorMessages;
export type SuccessMessageKey = keyof typeof SuccessMessages;
export type NotificationMessageKey = keyof typeof NotificationMessages;

// Ensure messages are readonly at compile time
export type ErrorMessageType = typeof ErrorMessages[ErrorMessageKey];
export type SuccessMessageType = typeof SuccessMessages[SuccessMessageKey];
export type NotificationMessageType = typeof NotificationMessages[NotificationMessageKey];