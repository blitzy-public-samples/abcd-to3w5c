// zod version: ^3.22.0
import { z } from 'zod';
import { User } from '../types/auth.types';
import { 
  validateEmail, 
  validateRequired, 
  VALIDATION_MESSAGES 
} from '../utils/validation.utils';

/**
 * Constants for profile validation rules
 * Following security best practices and accessibility guidelines
 */
export const MAX_EMAIL_LENGTH = 255; // RFC 5321 compliance
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MIN_DISPLAY_NAME_LENGTH = 2;

/**
 * Valid IANA timezone identifiers
 * This is a subset - in production, use a complete list from a timezone library
 */
export const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  // Add more timezones as needed
] as const;

/**
 * Interface for notification preferences with strict typing
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

/**
 * Comprehensive interface for profile update data
 * Implements strict typing and validation requirements
 */
export interface ProfileUpdateData {
  email: string;
  displayName: string;
  timezone: string;
  notificationPreferences: NotificationPreferences;
}

/**
 * Zod schema for notification preferences validation
 * Ensures all required boolean flags are present
 */
const notificationPreferencesSchema = z.object({
  email: z.boolean({
    required_error: 'Email notification preference is required',
    invalid_type_error: 'Email notification preference must be a boolean',
  }),
  push: z.boolean({
    required_error: 'Push notification preference is required',
    invalid_type_error: 'Push notification preference must be a boolean',
  }),
  inApp: z.boolean({
    required_error: 'In-app notification preference is required',
    invalid_type_error: 'In-app notification preference must be a boolean',
  }),
}).strict();

/**
 * Comprehensive Zod schema for profile updates
 * Implements strict validation rules with accessibility-friendly error messages
 */
export const profileUpdateSchema = z.object({
  email: z.string({
    required_error: VALIDATION_MESSAGES.REQUIRED_FIELD,
    invalid_type_error: 'Email must be a string',
  })
  .min(1, { message: VALIDATION_MESSAGES.REQUIRED_FIELD })
  .max(MAX_EMAIL_LENGTH, {
    message: `Email must be less than ${MAX_EMAIL_LENGTH} characters`,
  })
  .email({ message: VALIDATION_MESSAGES.INVALID_EMAIL })
  .transform(email => email.toLowerCase().trim()),

  displayName: z.string({
    required_error: VALIDATION_MESSAGES.REQUIRED_FIELD,
    invalid_type_error: 'Display name must be a string',
  })
  .min(MIN_DISPLAY_NAME_LENGTH, {
    message: `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters`,
  })
  .max(MAX_DISPLAY_NAME_LENGTH, {
    message: `Display name must be less than ${MAX_DISPLAY_NAME_LENGTH} characters`,
  })
  .regex(/^[a-zA-Z0-9\s-_]+$/, {
    message: 'Display name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  .transform(name => name.trim()),

  timezone: z.string({
    required_error: VALIDATION_MESSAGES.REQUIRED_FIELD,
    invalid_type_error: 'Timezone must be a string',
  })
  .refine(
    (tz) => VALID_TIMEZONES.includes(tz as any),
    { message: 'Invalid timezone selection' }
  ),

  notificationPreferences: notificationPreferencesSchema,
}).strict();

/**
 * Validates profile update data with enhanced security checks and accessibility support
 * @param data - Profile update data to validate
 * @returns Validation result with detailed, accessible error messages
 */
export const validateProfileUpdate = (data: ProfileUpdateData): {
  success: boolean;
  errors: Record<string, string>;
  sanitizedData?: ProfileUpdateData;
} => {
  try {
    // Perform initial required field validation
    const requiredFieldsCheck = validateRequired(data);
    if (!requiredFieldsCheck.isValid) {
      return {
        success: false,
        errors: requiredFieldsCheck.errors,
      };
    }

    // Perform enhanced email validation with security checks
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      return {
        success: false,
        errors: emailValidation.errors,
      };
    }

    // Parse and validate using Zod schema
    const validationResult = profileUpdateSchema.safeParse(data);

    if (!validationResult.success) {
      // Transform Zod errors into accessible format
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((error) => {
        errors[error.path.join('.')] = error.message;
      });
      return {
        success: false,
        errors,
      };
    }

    // Additional security checks for sanitized data
    const sanitizedData = validationResult.data;
    
    // Prevent HTML injection in display name
    if (/<[^>]*>/g.test(sanitizedData.displayName)) {
      return {
        success: false,
        errors: {
          displayName: 'Display name cannot contain HTML tags',
        },
      };
    }

    return {
      success: true,
      errors: {},
      sanitizedData,
    };
  } catch (error) {
    // Log unexpected validation errors securely
    console.error('Profile validation error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      errors: {
        general: 'An unexpected error occurred during validation',
      },
    };
  }
};

/**
 * Type guard to check if profile data is valid
 * @param data - Data to validate
 * @returns Type predicate for ProfileUpdateData
 */
export const isValidProfileData = (data: unknown): data is ProfileUpdateData => {
  const validation = validateProfileUpdate(data as ProfileUpdateData);
  return validation.success;
};

export default {
  validateProfileUpdate,
  profileUpdateSchema,
  isValidProfileData,
  VALID_TIMEZONES,
};