/**
 * @fileoverview Constants and configuration values for habit management
 * Provides centralized definition of validation rules, status values,
 * and achievement thresholds for the habit tracking application
 * @version 1.0.0
 */

import { FrequencyType } from '../types/habit.types';

/**
 * Validation rules for habit properties
 * Ensures consistent data validation across the application
 */
export const HABIT_VALIDATION = {
  /** Minimum length for habit name (3 characters) */
  NAME_MIN_LENGTH: 3,
  /** Maximum length for habit name (50 characters) */
  NAME_MAX_LENGTH: 50,
  /** Maximum length for habit description (500 characters) */
  DESCRIPTION_MAX_LENGTH: 500,
} as const;

/**
 * Type-safe frequency constants matching FrequencyType enum
 * Used for habit scheduling and frequency management
 */
export const HABIT_FREQUENCY = {
  /** Daily recurring habits */
  DAILY: FrequencyType.DAILY,
  /** Weekly recurring habits */
  WEEKLY: FrequencyType.WEEKLY,
  /** Custom schedule habits */
  CUSTOM: FrequencyType.CUSTOM,
} as const;

/**
 * Status values for habit lifecycle management
 * Defines all possible states a habit can be in
 */
export const HABIT_STATUS = {
  /** Habit is currently active and being tracked */
  ACTIVE: 'ACTIVE',
  /** Habit is temporarily paused */
  INACTIVE: 'INACTIVE',
  /** Habit has been marked as completed */
  COMPLETED: 'COMPLETED',
  /** Habit has been archived and is no longer tracked */
  ARCHIVED: 'ARCHIVED',
} as const;

/**
 * Default values for habit creation
 * Provides type-safe default configurations
 */
export const HABIT_DEFAULTS = {
  /** Default frequency type for new habits */
  DEFAULT_FREQUENCY: FrequencyType.DAILY,
  /** Default active status for new habits */
  DEFAULT_ACTIVE_STATUS: true,
} as const;

/**
 * Achievement thresholds for streak-based gamification
 * Defines the number of days required for each achievement level
 */
export const STREAK_THRESHOLDS = {
  /** Beginner achievement threshold (7 days) */
  BEGINNER: 7,
  /** Intermediate achievement threshold (21 days) */
  INTERMEDIATE: 21,
  /** Advanced achievement threshold (66 days) */
  ADVANCED: 66,
  /** Master achievement threshold (100 days) */
  MASTER: 100,
} as const;

/**
 * Type assertions to ensure type safety and immutability
 * These help TypeScript enforce correct usage of the constants
 */
Object.freeze(HABIT_VALIDATION);
Object.freeze(HABIT_FREQUENCY);
Object.freeze(HABIT_STATUS);
Object.freeze(HABIT_DEFAULTS);
Object.freeze(STREAK_THRESHOLDS);