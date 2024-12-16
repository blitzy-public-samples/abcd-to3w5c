/**
 * @fileoverview Utility functions for habit management, validation, and analytics
 * Provides comprehensive functionality for habit tracking and data transformation
 * @version 1.0.0
 */

import { 
  Habit, 
  HabitFrequency, 
  FrequencyType,
  HabitStatus 
} from '../types/habit.types';
import { HABIT_VALIDATION } from '../constants/habit.constants';
import { formatDate, calculateStreak } from './date.utils';
import { memoize } from 'lodash'; // v4.17.x

/**
 * Interface for progress calculation options
 */
interface ProgressOptions {
  includePartial?: boolean;
  timezoneName?: string;
}

/**
 * Interface for progress calculation result
 */
interface HabitProgress {
  completionRate: number;
  currentStreak: number;
  partialCompletions: number;
  trendData: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

/**
 * Validates a habit name against defined length constraints
 * @param name - Habit name to validate
 * @returns Boolean indicating if name is valid
 */
export const validateHabitName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  return name.length >= HABIT_VALIDATION.NAME_MIN_LENGTH && 
         name.length <= HABIT_VALIDATION.NAME_MAX_LENGTH;
};

/**
 * Validates a habit description against defined length constraints
 * @param description - Habit description to validate
 * @returns Boolean indicating if description is valid
 */
export const validateHabitDescription = (description?: string): boolean => {
  if (!description) {
    return true; // Description is optional
  }
  
  return description.length <= HABIT_VALIDATION.DESCRIPTION_MAX_LENGTH;
};

/**
 * Memoized function to filter completion dates for performance
 */
const filterCompletionDates = memoize(
  (dates: Date[], startDate: Date): Date[] => {
    return dates.filter(date => date >= startDate);
  },
  (dates: Date[], startDate: Date) => `${dates.length}-${startDate.getTime()}`
);

/**
 * Calculates comprehensive habit progress metrics
 * @param habit - Habit object to analyze
 * @param completionDates - Array of completion dates
 * @param options - Calculation options
 * @returns Object containing progress metrics
 */
export const calculateHabitProgress = (
  habit: Habit,
  completionDates: Date[],
  options: ProgressOptions = {}
): HabitProgress => {
  const {
    includePartial = true,
    timezoneName = 'UTC'
  } = options;

  try {
    // Validate inputs
    if (!habit || !Array.isArray(completionDates)) {
      throw new Error('Invalid input parameters');
    }

    // Filter dates for active period only
    const startDate = new Date(habit.createdAt);
    const validCompletions = filterCompletionDates(completionDates, startDate);

    // Calculate completion rate based on frequency type
    const totalExpectedCompletions = calculateExpectedCompletions(habit.frequency, startDate);
    const completionRate = totalExpectedCompletions > 0 
      ? (validCompletions.length / totalExpectedCompletions) * 100
      : 0;

    // Calculate current streak
    const currentStreak = calculateStreak(validCompletions, habit.frequency);

    // Calculate partial completions if enabled
    const partialCompletions = includePartial 
      ? calculatePartialCompletions(validCompletions, habit.frequency)
      : 0;

    // Generate trend data
    const trendData = generateTrendData(validCompletions, habit.frequency, timezoneName);

    return {
      completionRate: Math.round(completionRate * 100) / 100,
      currentStreak,
      partialCompletions,
      trendData
    };
  } catch (error) {
    console.error('Error calculating habit progress:', error);
    return {
      completionRate: 0,
      currentStreak: 0,
      partialCompletions: 0,
      trendData: { daily: [], weekly: [], monthly: [] }
    };
  }
};

/**
 * Formats habit frequency into human-readable text
 * @param frequency - Habit frequency configuration
 * @returns Formatted frequency description
 */
export const formatHabitFrequency = (frequency: HabitFrequency): string => {
  if (!frequency) {
    return 'Invalid frequency';
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  switch (frequency.type) {
    case FrequencyType.DAILY:
      return 'Every day';
      
    case FrequencyType.WEEKLY:
      if (frequency.days.length === 7) {
        return 'Every day of the week';
      }
      const dayList = frequency.days
        .sort((a, b) => a - b)
        .map(day => dayNames[day])
        .join(', ');
      return `Every ${dayList}`;
      
    case FrequencyType.CUSTOM:
      if (!frequency.customSchedule) {
        return 'Custom schedule';
      }
      const customDays = frequency.customSchedule.days
        .map(day => dayNames[day])
        .join(', ');
      return `Custom: ${customDays} at ${frequency.customSchedule.time}`;
      
    default:
      return 'Invalid frequency type';
  }
};

/**
 * Sorts habits by their current streak in descending order
 * @param habits - Array of habits to sort
 * @param streakData - Object containing streak information
 * @returns Sorted array of habits
 */
export const sortHabitsByStreak = (
  habits: Habit[],
  streakData: { [key: string]: number }
): Habit[] => {
  return [...habits].sort((a, b) => {
    const streakA = streakData[a.id] || 0;
    const streakB = streakData[b.id] || 0;
    
    if (streakA === streakB) {
      // Secondary sort by active status and creation date
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    
    return streakB - streakA;
  });
};

/**
 * Helper function to calculate expected completions based on frequency
 */
const calculateExpectedCompletions = (
  frequency: HabitFrequency,
  startDate: Date
): number => {
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (frequency.type) {
    case FrequencyType.DAILY:
      return daysDiff + 1;
      
    case FrequencyType.WEEKLY:
      return Math.ceil(daysDiff / 7) * frequency.days.length;
      
    case FrequencyType.CUSTOM:
      if (!frequency.customSchedule) return 0;
      return Math.ceil(daysDiff / 7) * frequency.customSchedule.days.length;
      
    default:
      return 0;
  }
};

/**
 * Helper function to calculate partial completions
 */
const calculatePartialCompletions = (
  completionDates: Date[],
  frequency: HabitFrequency
): number => {
  const today = new Date();
  const partialWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  return completionDates.filter(date => {
    const timeDiff = today.getTime() - date.getTime();
    return timeDiff <= partialWindow;
  }).length;
};

/**
 * Helper function to generate trend data for visualization
 */
const generateTrendData = (
  completionDates: Date[],
  frequency: HabitFrequency,
  timezoneName: string
): { daily: number[], weekly: number[], monthly: number[] } => {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return formatDate(date, 'YYYY-MM-DD', timezoneName);
  }).reverse();

  const dailyCompletions = last30Days.map(day => 
    completionDates.filter(date => 
      formatDate(date, 'YYYY-MM-DD', timezoneName) === day
    ).length
  );

  const weeklyCompletions = Array.from({ length: 4 }, (_, weekIndex) => {
    const weekStart = weekIndex * 7;
    return dailyCompletions
      .slice(weekStart, weekStart + 7)
      .reduce((sum, count) => sum + count, 0);
  });

  const monthlyCompletions = [
    dailyCompletions.reduce((sum, count) => sum + count, 0)
  ];

  return {
    daily: dailyCompletions,
    weekly: weeklyCompletions,
    monthly: monthlyCompletions
  };
};