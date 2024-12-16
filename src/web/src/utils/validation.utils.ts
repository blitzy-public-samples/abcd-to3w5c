// @ts-check
import { isEmail, isStrongPassword } from 'validator'; // v13.9.0

/**
 * Interface for validation function results with detailed error tracking
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  touched: boolean;
}

/**
 * Options for date validation with specific constraints
 */
interface DateValidationOptions {
  allowFuture?: boolean;
  allowPast?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Constants defining password security requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
  maxLength: 128,
} as const;

/**
 * Validation messages with i18n support structure
 */
const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be 12-128 characters with at least one uppercase letter, lowercase letter, number, and symbol',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
  INVALID_DATE: 'Please enter a valid date',
  FUTURE_DATE_REQUIRED: 'Date must be in the future',
  PAST_DATE_REQUIRED: 'Date must be in the past',
  INVALID_LENGTH: 'Input length must be between {min} and {max} characters',
  INVALID_FORMAT: 'Input format is invalid',
} as const;

/**
 * List of common disposable email domains for additional security
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwawaymail.com',
  'mailinator.com',
  // Add more as needed
] as const;

/**
 * Validates email format using validator.js isEmail with additional security checks
 * @param email - Email address to validate
 * @returns ValidationResult with detailed error messages
 */
export const validateEmail = (email: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true,
  };

  // Normalize email input
  const normalizedEmail = email?.trim().toLowerCase();

  // Check if email is empty
  if (!normalizedEmail) {
    result.isValid = false;
    result.errors.email = VALIDATION_MESSAGES.REQUIRED_FIELD;
    return result;
  }

  // Validate email length
  if (normalizedEmail.length > 254) { // RFC 5321
    result.isValid = false;
    result.errors.email = VALIDATION_MESSAGES.INVALID_LENGTH.replace('{min}', '1').replace('{max}', '254');
    return result;
  }

  // Validate email format
  if (!isEmail(normalizedEmail, { allow_utf8_local_part: false, require_tld: true })) {
    result.isValid = false;
    result.errors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    return result;
  }

  // Check for disposable email domains
  const domain = normalizedEmail.split('@')[1];
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain as any)) {
    result.isValid = false;
    result.errors.email = 'Please use a non-disposable email address';
    return result;
  }

  return result;
};

/**
 * Validates password strength using enhanced security requirements
 * @param password - Password to validate
 * @returns ValidationResult with security-focused feedback
 */
export const validatePassword = (password: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true,
  };

  // Check if password is empty
  if (!password) {
    result.isValid = false;
    result.errors.password = VALIDATION_MESSAGES.REQUIRED_FIELD;
    return result;
  }

  // Check password length constraints
  if (password.length < PASSWORD_REQUIREMENTS.minLength || 
      password.length > PASSWORD_REQUIREMENTS.maxLength) {
    result.isValid = false;
    result.errors.password = VALIDATION_MESSAGES.INVALID_PASSWORD;
    return result;
  }

  // Validate password strength
  if (!isStrongPassword(password, {
    minLength: PASSWORD_REQUIREMENTS.minLength,
    minLowercase: PASSWORD_REQUIREMENTS.minLowercase,
    minUppercase: PASSWORD_REQUIREMENTS.minUppercase,
    minNumbers: PASSWORD_REQUIREMENTS.minNumbers,
    minSymbols: PASSWORD_REQUIREMENTS.minSymbols,
  })) {
    result.isValid = false;
    result.errors.password = VALIDATION_MESSAGES.INVALID_PASSWORD;
    return result;
  }

  // Check for common weak patterns
  const commonPatterns = [
    /^[a-zA-Z]+\d+$/,  // Only letters followed by numbers
    /^[a-zA-Z]+[!@#$%^&*]+$/,  // Only letters followed by symbols
    /(.)\1{2,}/,  // Character repeated more than twice
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    result.isValid = false;
    result.errors.password = 'Password contains common weak patterns';
    return result;
  }

  return result;
};

/**
 * Validates if a value is not empty with type-specific checks
 * @param value - Value to check for required status
 * @returns ValidationResult for required field check
 */
export const validateRequired = (value: unknown): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true,
  };

  // Handle different types of empty values
  if (value === undefined || value === null) {
    result.isValid = false;
  } else if (typeof value === 'string' && value.trim() === '') {
    result.isValid = false;
  } else if (Array.isArray(value) && value.length === 0) {
    result.isValid = false;
  } else if (typeof value === 'object' && Object.keys(value).length === 0) {
    result.isValid = false;
  }

  if (!result.isValid) {
    result.errors.required = VALIDATION_MESSAGES.REQUIRED_FIELD;
  }

  return result;
};

/**
 * Comprehensive date validation with various constraints
 * @param date - Date to validate
 * @param options - Validation options for date constraints
 * @returns ValidationResult for date checks
 */
export const validateDate = (date: Date, options: DateValidationOptions = {}): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true,
  };

  // Check if date is valid
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    result.isValid = false;
    result.errors.date = VALIDATION_MESSAGES.INVALID_DATE;
    return result;
  }

  const now = new Date();

  // Check future date constraint
  if (options.allowFuture === false && date > now) {
    result.isValid = false;
    result.errors.date = VALIDATION_MESSAGES.PAST_DATE_REQUIRED;
    return result;
  }

  // Check past date constraint
  if (options.allowPast === false && date < now) {
    result.isValid = false;
    result.errors.date = VALIDATION_MESSAGES.FUTURE_DATE_REQUIRED;
    return result;
  }

  // Check minimum date constraint
  if (options.minDate && date < options.minDate) {
    result.isValid = false;
    result.errors.date = `Date must be after ${options.minDate.toLocaleDateString()}`;
    return result;
  }

  // Check maximum date constraint
  if (options.maxDate && date > options.maxDate) {
    result.isValid = false;
    result.errors.date = `Date must be before ${options.maxDate.toLocaleDateString()}`;
    return result;
  }

  return result;
};

/**
 * Utility function to combine multiple validation results
 * @param results - Array of validation results to combine
 * @returns Combined ValidationResult
 */
export const combineValidationResults = (results: ValidationResult[]): ValidationResult => {
  return results.reduce((combined, current) => ({
    isValid: combined.isValid && current.isValid,
    errors: { ...combined.errors, ...current.errors },
    touched: combined.touched || current.touched,
  }), {
    isValid: true,
    errors: {},
    touched: false,
  });
};