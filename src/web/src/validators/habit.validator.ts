/**
 * @fileoverview Comprehensive validation logic for habit-related forms and data structures
 * Implements robust input sanitization, type checking, and detailed error messaging
 * @version 1.0.0
 */

import { 
  ValidationResult, 
  validateRequired, 
  validateDate 
} from '../utils/validation.utils';
import { 
  CreateHabitPayload, 
  UpdateHabitPayload, 
  HabitFrequency,
  FrequencyType 
} from '../types/habit.types';

/**
 * Constants for validation constraints and error messages
 */
export const HABIT_VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Habit name is required',
  NAME_TOO_LONG: 'Habit name must be less than 100 characters',
  NAME_INVALID_CHARS: 'Habit name contains invalid characters',
  DESCRIPTION_TOO_LONG: 'Description must be less than 500 characters',
  DESCRIPTION_INVALID_CHARS: 'Description contains invalid characters',
  FREQUENCY_REQUIRED: 'Frequency configuration is required',
  FREQUENCY_TYPE_INVALID: 'Invalid frequency type',
  FREQUENCY_VALUE_INVALID: 'Frequency value must be greater than 0',
  FREQUENCY_VALUE_TOO_HIGH: 'Frequency value exceeds maximum limit',
  FREQUENCY_DAYS_REQUIRED: 'At least one day must be selected for custom frequency',
  FREQUENCY_DAYS_INVALID: 'Invalid days selected for custom frequency',
  REMINDER_TIME_INVALID: 'Invalid reminder time',
  REMINDER_TIME_PAST: 'Reminder time must be in the future'
} as const;

/**
 * Validates habit frequency configuration with comprehensive type checking
 * @param frequency - Habit frequency configuration to validate
 * @returns Validation result with detailed error messages
 */
const validateHabitFrequency = (frequency: HabitFrequency): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true
  };

  // Validate frequency type
  if (!Object.values(FrequencyType).includes(frequency.type)) {
    result.isValid = false;
    result.errors.frequencyType = HABIT_VALIDATION_MESSAGES.FREQUENCY_TYPE_INVALID;
    return result;
  }

  // Validate frequency value
  if (frequency.value <= 0) {
    result.isValid = false;
    result.errors.frequencyValue = HABIT_VALIDATION_MESSAGES.FREQUENCY_VALUE_INVALID;
    return result;
  }

  // Type-specific validations
  switch (frequency.type) {
    case FrequencyType.DAILY:
      if (frequency.value > 24) {
        result.isValid = false;
        result.errors.frequencyValue = HABIT_VALIDATION_MESSAGES.FREQUENCY_VALUE_TOO_HIGH;
      }
      break;

    case FrequencyType.WEEKLY:
      if (frequency.value > 7) {
        result.isValid = false;
        result.errors.frequencyValue = HABIT_VALIDATION_MESSAGES.FREQUENCY_VALUE_TOO_HIGH;
      }
      break;

    case FrequencyType.CUSTOM:
      // Validate days array
      if (!Array.isArray(frequency.days) || frequency.days.length === 0) {
        result.isValid = false;
        result.errors.frequencyDays = HABIT_VALIDATION_MESSAGES.FREQUENCY_DAYS_REQUIRED;
        return result;
      }

      // Check for valid day numbers and duplicates
      const validDays = new Set<number>();
      for (const day of frequency.days) {
        if (typeof day !== 'number' || day < 0 || day > 6) {
          result.isValid = false;
          result.errors.frequencyDays = HABIT_VALIDATION_MESSAGES.FREQUENCY_DAYS_INVALID;
          return result;
        }
        validDays.add(day);
      }

      // Check for duplicates
      if (validDays.size !== frequency.days.length) {
        result.isValid = false;
        result.errors.frequencyDays = HABIT_VALIDATION_MESSAGES.FREQUENCY_DAYS_INVALID;
      }
      break;
  }

  return result;
};

/**
 * Validates the payload for creating a new habit
 * @param payload - Create habit payload to validate
 * @returns Validation result with comprehensive error checking
 */
export const validateCreateHabitPayload = (payload: CreateHabitPayload): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true
  };

  // Validate required name field
  const nameValidation = validateRequired(payload.name);
  if (!nameValidation.isValid) {
    result.isValid = false;
    result.errors.name = HABIT_VALIDATION_MESSAGES.NAME_REQUIRED;
  } else {
    // Validate name length and characters
    const sanitizedName = payload.name.trim();
    if (sanitizedName.length > 100) {
      result.isValid = false;
      result.errors.name = HABIT_VALIDATION_MESSAGES.NAME_TOO_LONG;
    } else if (!/^[\w\s\-']+$/.test(sanitizedName)) {
      result.isValid = false;
      result.errors.name = HABIT_VALIDATION_MESSAGES.NAME_INVALID_CHARS;
    }
  }

  // Validate description if provided
  if (payload.description) {
    const sanitizedDescription = payload.description.trim();
    if (sanitizedDescription.length > 500) {
      result.isValid = false;
      result.errors.description = HABIT_VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG;
    } else if (!/^[\w\s\-'.!?,]+$/.test(sanitizedDescription)) {
      result.isValid = false;
      result.errors.description = HABIT_VALIDATION_MESSAGES.DESCRIPTION_INVALID_CHARS;
    }
  }

  // Validate frequency configuration
  const frequencyValidation = validateHabitFrequency(payload.frequency);
  if (!frequencyValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...frequencyValidation.errors };
  }

  // Validate reminder time if provided
  if (payload.reminderTime) {
    const reminderValidation = validateDate(payload.reminderTime, { 
      allowPast: false 
    });
    if (!reminderValidation.isValid) {
      result.isValid = false;
      result.errors.reminderTime = HABIT_VALIDATION_MESSAGES.REMINDER_TIME_PAST;
    }
  }

  return result;
};

/**
 * Validates the payload for updating an existing habit
 * @param payload - Update habit payload to validate
 * @returns Validation result with comprehensive error checking
 */
export const validateUpdateHabitPayload = (payload: UpdateHabitPayload): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: {},
    touched: true
  };

  // Validate required name field
  const nameValidation = validateRequired(payload.name);
  if (!nameValidation.isValid) {
    result.isValid = false;
    result.errors.name = HABIT_VALIDATION_MESSAGES.NAME_REQUIRED;
  } else {
    // Validate name length and characters
    const sanitizedName = payload.name.trim();
    if (sanitizedName.length > 100) {
      result.isValid = false;
      result.errors.name = HABIT_VALIDATION_MESSAGES.NAME_TOO_LONG;
    } else if (!/^[\w\s\-']+$/.test(sanitizedName)) {
      result.isValid = false;
      result.errors.name = HABIT_VALIDATION_MESSAGES.NAME_INVALID_CHARS;
    }
  }

  // Validate description if provided
  if (payload.description) {
    const sanitizedDescription = payload.description.trim();
    if (sanitizedDescription.length > 500) {
      result.isValid = false;
      result.errors.description = HABIT_VALIDATION_MESSAGES.DESCRIPTION_TOO_LONG;
    } else if (!/^[\w\s\-'.!?,]+$/.test(sanitizedDescription)) {
      result.isValid = false;
      result.errors.description = HABIT_VALIDATION_MESSAGES.DESCRIPTION_INVALID_CHARS;
    }
  }

  // Validate frequency configuration
  const frequencyValidation = validateHabitFrequency(payload.frequency);
  if (!frequencyValidation.isValid) {
    result.isValid = false;
    result.errors = { ...result.errors, ...frequencyValidation.errors };
  }

  // Validate reminder time if provided
  if (payload.reminderTime) {
    const reminderValidation = validateDate(payload.reminderTime, { 
      allowPast: false 
    });
    if (!reminderValidation.isValid) {
      result.isValid = false;
      result.errors.reminderTime = HABIT_VALIDATION_MESSAGES.REMINDER_TIME_PAST;
    }
  }

  // Validate isActive is boolean
  if (typeof payload.isActive !== 'boolean') {
    result.isValid = false;
    result.errors.isActive = 'Invalid active status';
  }

  return result;
};