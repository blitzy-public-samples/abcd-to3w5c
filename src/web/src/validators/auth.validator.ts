// validator version: ^13.9.0
// @auth0/auth0-spa-js version: ^2.1.0

import { LoginCredentials, RegisterCredentials } from '../types/auth.types';
import { 
  ValidationResult, 
  validateEmail, 
  validatePassword, 
  VALIDATION_MESSAGES 
} from '../utils/validation.utils';

/**
 * Enhanced validation for login credentials with comprehensive security checks
 * @param credentials - Login credentials to validate
 * @returns Detailed validation result with security-focused feedback
 */
export const validateLoginCredentials = (credentials: LoginCredentials): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true
  };

  // Validate email with enhanced security checks
  const emailValidation = validateEmail(credentials.email);
  if (!emailValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...emailValidation.errors };
  }

  // Validate password with security requirements
  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...passwordValidation.errors };
  }

  // Additional security checks for login attempt
  if (credentials.password.toLowerCase().includes(credentials.email.split('@')[0].toLowerCase())) {
    result.isValid = false;
    result.errors.password = 'Password cannot contain parts of email address';
  }

  return result;
};

/**
 * Comprehensive validation for registration credentials with strict security requirements
 * @param credentials - Registration credentials to validate
 * @returns Detailed validation result with enhanced security checks
 */
export const validateRegistrationCredentials = (credentials: RegisterCredentials): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true
  };

  // Validate email with enhanced security
  const emailValidation = validateEmail(credentials.email);
  if (!emailValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...emailValidation.errors };
  }

  // Validate password with strict requirements
  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...passwordValidation.errors };
  }

  // Validate password confirmation
  if (credentials.password !== credentials.confirmPassword) {
    result.isValid = false;
    result.errors.confirmPassword = VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH;
  }

  // Additional registration-specific validations
  if (!credentials.acceptTerms) {
    result.isValid = false;
    result.errors.acceptTerms = 'You must accept the terms and conditions';
  }

  // Check for sequential characters in password
  const sequentialPattern = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i;
  if (sequentialPattern.test(credentials.password)) {
    result.isValid = false;
    result.errors.password = 'Password cannot contain sequential characters';
  }

  return result;
};

/**
 * Validates password reset credentials with enhanced security checks
 * @param newPassword - New password to validate
 * @param confirmPassword - Password confirmation to validate
 * @returns Validation result with comprehensive security checks
 */
export const validatePasswordReset = (
  newPassword: string,
  confirmPassword: string
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true
  };

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...passwordValidation.errors };
  }

  // Validate password confirmation
  if (newPassword !== confirmPassword) {
    result.isValid = false;
    result.errors.confirmPassword = VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH;
  }

  // Additional password reset specific validations
  const commonWords = ['password', 'admin', 'user', 'login', 'letmein', 'welcome'];
  if (commonWords.some(word => newPassword.toLowerCase().includes(word))) {
    result.isValid = false;
    result.errors.password = 'Password cannot contain common words';
  }

  // Check for keyboard pattern sequences
  const keyboardPatterns = [
    'qwerty', 'asdfgh', 'zxcvbn', 'qwertz', 'azerty',
    '!@#$%^', '123qwe', '1qaz2wsx'
  ];
  if (keyboardPatterns.some(pattern => newPassword.toLowerCase().includes(pattern))) {
    result.isValid = false;
    result.errors.password = 'Password cannot contain keyboard patterns';
  }

  return result;
};