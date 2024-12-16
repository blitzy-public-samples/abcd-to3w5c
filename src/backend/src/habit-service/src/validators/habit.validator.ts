/**
 * @fileoverview Implements comprehensive server-side validation for habit-related data
 * with robust security checks, data sanitization, and business rule validation.
 * 
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { CreateHabitDTO, UpdateHabitDTO, FrequencyType, HabitFrequency } from '../interfaces/habit.interface';

// Constants for validation rules
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 500;
const MAX_REMINDER_TIME_FUTURE_DAYS = 365;

/**
 * Interface for detailed validation results with field-specific errors
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

/**
 * Validates time string format (HH:mm)
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Schema for habit frequency validation
 */
const frequencySchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(FrequencyType))
    .required()
    .messages({
      'any.required': 'Frequency type is required',
      'any.only': 'Invalid frequency type'
    }),
  value: Joi.number()
    .min(1)
    .max(365)
    .required()
    .messages({
      'number.base': 'Frequency value must be a number',
      'number.min': 'Frequency value must be at least 1',
      'number.max': 'Frequency value cannot exceed 365'
    }),
  days: Joi.array()
    .items(Joi.number().min(0).max(6))
    .required()
    .messages({
      'array.base': 'Days must be an array',
      'number.min': 'Day values must be between 0 and 6',
      'number.max': 'Day values must be between 0 and 6'
    }),
  customSchedule: Joi.object({
    time: Joi.string()
      .pattern(timeRegex)
      .messages({
        'string.pattern.base': 'Time must be in 24-hour format (HH:mm)'
      }),
    days: Joi.array()
      .items(Joi.number().min(0).max(6))
      .required()
      .messages({
        'array.base': 'Custom schedule days must be an array',
        'number.min': 'Day values must be between 0 and 6',
        'number.max': 'Day values must be between 0 and 6'
      })
  }).allow(null)
});

/**
 * Schema for habit creation validation
 */
export const createHabitSchema = Joi.object({
  name: Joi.string()
    .min(NAME_MIN_LENGTH)
    .max(NAME_MAX_LENGTH)
    .required()
    .trim()
    .messages({
      'string.empty': 'Name is required',
      'string.min': `Name must be at least ${NAME_MIN_LENGTH} characters`,
      'string.max': `Name cannot exceed ${NAME_MAX_LENGTH} characters`
    }),
  description: Joi.string()
    .max(DESCRIPTION_MAX_LENGTH)
    .allow('')
    .trim()
    .messages({
      'string.max': `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
    }),
  frequency: frequencySchema,
  reminderTime: Joi.date()
    .allow(null)
    .min('now')
    .max(`now+${MAX_REMINDER_TIME_FUTURE_DAYS}days`)
    .messages({
      'date.min': 'Reminder time must be in the future',
      'date.max': `Reminder time cannot be more than ${MAX_REMINDER_TIME_FUTURE_DAYS} days in the future`
    })
});

/**
 * Schema for habit update validation
 */
export const updateHabitSchema = Joi.object({
  name: Joi.string()
    .min(NAME_MIN_LENGTH)
    .max(NAME_MAX_LENGTH)
    .trim()
    .messages({
      'string.min': `Name must be at least ${NAME_MIN_LENGTH} characters`,
      'string.max': `Name cannot exceed ${NAME_MAX_LENGTH} characters`
    }),
  description: Joi.string()
    .max(DESCRIPTION_MAX_LENGTH)
    .allow('')
    .trim()
    .messages({
      'string.max': `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
    }),
  frequency: frequencySchema,
  reminderTime: Joi.date()
    .allow(null)
    .min('now')
    .max(`now+${MAX_REMINDER_TIME_FUTURE_DAYS}days`)
    .messages({
      'date.min': 'Reminder time must be in the future',
      'date.max': `Reminder time cannot be more than ${MAX_REMINDER_TIME_FUTURE_DAYS} days in the future`
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
}).min(1); // Require at least one field for updates

/**
 * Sanitizes input string to prevent XSS attacks
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Validates frequency configuration against business rules
 */
function validateFrequencyBusinessRules(frequency: HabitFrequency): string[] {
  const errors: string[] = [];

  if (frequency.type === FrequencyType.DAILY && frequency.value > 7) {
    errors.push('Daily frequency value cannot exceed 7 days');
  }

  if (frequency.type === FrequencyType.WEEKLY && frequency.value > 52) {
    errors.push('Weekly frequency value cannot exceed 52 weeks');
  }

  if (frequency.type === FrequencyType.CUSTOM && !frequency.customSchedule) {
    errors.push('Custom frequency requires a custom schedule');
  }

  if (frequency.days.length === 0) {
    errors.push('At least one day must be selected');
  }

  return errors;
}

/**
 * Validates habit creation data with comprehensive error checking
 */
export function validateCreateHabit(data: CreateHabitDTO): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    fieldErrors: {}
  };

  // Sanitize string inputs
  const sanitizedData = {
    ...data,
    name: sanitizeString(data.name),
    description: data.description ? sanitizeString(data.description) : ''
  };

  // Validate against schema
  const schemaValidation = createHabitSchema.validate(sanitizedData, {
    abortEarly: false,
    allowUnknown: false
  });

  if (schemaValidation.error) {
    result.isValid = false;
    schemaValidation.error.details.forEach(error => {
      const field = error.path[0] as string;
      if (!result.fieldErrors[field]) {
        result.fieldErrors[field] = [];
      }
      result.fieldErrors[field].push(error.message);
      result.errors.push(error.message);
    });
  }

  // Validate business rules for frequency
  if (data.frequency) {
    const frequencyErrors = validateFrequencyBusinessRules(data.frequency);
    if (frequencyErrors.length > 0) {
      result.isValid = false;
      result.fieldErrors.frequency = frequencyErrors;
      result.errors.push(...frequencyErrors);
    }
  }

  return result;
}

/**
 * Validates habit update data with partial update support
 */
export function validateUpdateHabit(data: UpdateHabitDTO): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    fieldErrors: {}
  };

  // Sanitize string inputs if provided
  const sanitizedData = {
    ...data,
    name: data.name ? sanitizeString(data.name) : undefined,
    description: data.description ? sanitizeString(data.description) : undefined
  };

  // Validate against schema
  const schemaValidation = updateHabitSchema.validate(sanitizedData, {
    abortEarly: false,
    allowUnknown: false
  });

  if (schemaValidation.error) {
    result.isValid = false;
    schemaValidation.error.details.forEach(error => {
      const field = error.path[0] as string;
      if (!result.fieldErrors[field]) {
        result.fieldErrors[field] = [];
      }
      result.fieldErrors[field].push(error.message);
      result.errors.push(error.message);
    });
  }

  // Validate business rules for frequency if provided
  if (data.frequency) {
    const frequencyErrors = validateFrequencyBusinessRules(data.frequency);
    if (frequencyErrors.length > 0) {
      result.isValid = false;
      result.fieldErrors.frequency = frequencyErrors;
      result.errors.push(...frequencyErrors);
    }
  }

  return result;
}