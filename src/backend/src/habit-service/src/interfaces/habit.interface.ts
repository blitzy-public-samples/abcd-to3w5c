/**
 * @fileoverview Defines comprehensive TypeScript interfaces and types for habit entities,
 * frequency configurations, and data transfer objects in the habit tracking service.
 * Implements strict typing and validation for all habit-related data structures.
 * 
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Enum defining possible habit frequency types with strict validation.
 * Used to specify how often a habit should be performed.
 */
export enum FrequencyType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM'
}

/**
 * Interface defining the structure for habit frequency configuration.
 * Supports flexible scheduling with custom options for different frequency types.
 */
export interface HabitFrequency {
  /** Type of frequency schedule (daily, weekly, or custom) */
  type: FrequencyType;

  /** Numeric value associated with the frequency (e.g., every X days) */
  value: number;

  /** Array of days (0-6, where 0 is Sunday) when the habit should be performed */
  days: number[];

  /** Optional custom schedule configuration with specific times */
  customSchedule: {
    /** Time of day in 24-hour format (HH:mm) */
    time: string;
    /** Specific days for custom schedule */
    days: number[];
  } | null;
}

/**
 * Main interface representing a habit entity with full type safety and validation.
 * Extends BaseEntity to inherit common fields like id and timestamps.
 */
export interface Habit extends BaseEntity {
  /** UUID of the user who owns this habit */
  userId: string;

  /** Name of the habit (1-100 characters) */
  name: string;

  /** Detailed description of the habit (0-500 characters) */
  description: string;

  /** Frequency configuration specifying when the habit should be performed */
  frequency: HabitFrequency;

  /** Optional reminder time for habit notifications */
  reminderTime: Date | null;

  /** Flag indicating if the habit is currently active */
  isActive: boolean;
}

/**
 * Data transfer object for habit creation with required fields.
 * Omits system-managed fields like id and timestamps.
 */
export interface CreateHabitDTO {
  /** Name of the habit (1-100 characters) */
  name: string;

  /** Detailed description of the habit (0-500 characters) */
  description: string;

  /** Frequency configuration specifying when the habit should be performed */
  frequency: HabitFrequency;

  /** Optional reminder time for habit notifications */
  reminderTime: Date | null;
}

/**
 * Data transfer object for habit updates with all fields optional.
 * Allows partial updates of habit properties.
 */
export interface UpdateHabitDTO {
  /** Updated name of the habit (1-100 characters) */
  name?: string;

  /** Updated description of the habit (0-500 characters) */
  description?: string;

  /** Updated frequency configuration */
  frequency?: HabitFrequency;

  /** Updated reminder time */
  reminderTime?: Date | null;

  /** Updated active status */
  isActive?: boolean;
}

/**
 * Type guard to validate if a frequency type is valid
 * @param type - The frequency type to validate
 */
export function isValidFrequencyType(type: string): type is FrequencyType {
  return Object.values(FrequencyType).includes(type as FrequencyType);
}

/**
 * Type guard to validate if a habit frequency configuration is valid
 * @param frequency - The frequency configuration to validate
 */
export function isValidHabitFrequency(frequency: HabitFrequency): boolean {
  // Validate days array contains valid day numbers (0-6)
  const hasValidDays = frequency.days.every(day => day >= 0 && day <= 6);

  // Validate custom schedule if present
  if (frequency.customSchedule) {
    const hasValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(frequency.customSchedule.time);
    const hasValidCustomDays = frequency.customSchedule.days.every(day => day >= 0 && day <= 6);
    return hasValidDays && hasValidTime && hasValidCustomDays;
  }

  return hasValidDays;
}