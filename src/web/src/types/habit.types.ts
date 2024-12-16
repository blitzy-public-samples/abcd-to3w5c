/**
 * @fileoverview TypeScript type definitions for habit-related data structures
 * Supports habit management, tracking, and analytics visualization
 * @version 1.0.0
 */

/**
 * Enum defining possible habit frequency types
 */
export enum FrequencyType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum defining possible habit lifecycle statuses
 */
export enum HabitStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Interface defining habit frequency configuration
 * Supports daily, weekly, and custom scheduling patterns
 */
export interface HabitFrequency {
  type: FrequencyType;
  value: number;
  days: number[];  // 0-6 representing Sunday-Saturday
  customSchedule: {
    time: string;  // 24-hour format "HH:mm"
    days: number[];
  } | null;
}

/**
 * Core habit entity interface with comprehensive tracking capabilities
 */
export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  frequency: HabitFrequency;
  reminderTime: Date | null;
  status: HabitStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for tracking individual habit completions
 * Includes support for notes and mood tracking
 */
export interface HabitLog {
  id: string;
  habitId: string;
  completedAt: Date;
  notes: string | null;
  mood: number | null;  // 1-5 scale for mood tracking
}

/**
 * Interface for detailed habit streak tracking
 */
export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedAt: Date;
  streakHistory: Array<{
    startDate: Date;
    endDate: Date;
    length: number;
  }>;
}

/**
 * Interface for comprehensive habit statistics
 * Supports analytics and visualization features
 */
export interface HabitStatistics {
  habitId: string;
  completionRate: number;  // Percentage (0-100)
  totalCompletions: number;
  currentStreak: number;
  bestStreak: number;
  weeklyProgress: { [key: string]: number };  // ISO week number -> completion count
  monthlyProgress: { [key: string]: number };  // ISO month -> completion count
}

/**
 * Type definition for habit creation payload
 */
export type CreateHabitPayload = {
  name: string;
  description: string;
  frequency: HabitFrequency;
  reminderTime: Date | null;
};

/**
 * Type definition for habit update payload
 */
export type UpdateHabitPayload = {
  name: string;
  description: string;
  frequency: HabitFrequency;
  reminderTime: Date | null;
  status: HabitStatus;
  isActive: boolean;
};

/**
 * Type guard to check if a frequency type is custom
 */
export const isCustomFrequency = (frequency: HabitFrequency): boolean => {
  return frequency.type === FrequencyType.CUSTOM;
};

/**
 * Type guard to check if a habit is active
 */
export const isActiveHabit = (habit: Habit): boolean => {
  return habit.status === HabitStatus.ACTIVE && habit.isActive;
};