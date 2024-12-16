/**
 * @fileoverview Date utility functions for the Habit Tracking Application
 * Provides timezone-aware date manipulation, formatting, and validation utilities
 * @version 1.0.0
 */

import dayjs from 'dayjs'; // v1.11.x
import utc from 'dayjs/plugin/utc'; // v1.11.x
import timezone from 'dayjs/plugin/timezone'; // v1.11.x
import { AnalyticsTimeframe } from '../types/analytics.types';
import { HabitFrequency, FrequencyType } from '../types/habit.types';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Constants
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME_FORMAT = 'HH:mm';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Error messages for date operations
 */
const ERROR_MESSAGES = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid date format',
  INVALID_TIMEZONE: 'Invalid timezone',
  INVALID_FREQUENCY: 'Invalid habit frequency',
  INVALID_TIMEFRAME: 'Invalid analytics timeframe'
} as const;

/**
 * Formats a date into a standardized string format with timezone support
 * @param date - Date to format
 * @param format - Output format (defaults to DEFAULT_DATE_FORMAT)
 * @param timezone - Target timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Formatted date string
 * @throws Error if date or timezone is invalid
 */
export const formatDate = (
  date: Date | string | null | undefined,
  format: string = DEFAULT_DATE_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  try {
    if (!date) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    const dayjsDate = dayjs(date).tz(timezone);
    
    if (!dayjsDate.isValid()) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    return dayjsDate.format(format);
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_MESSAGES.INVALID_DATE) {
      throw error;
    }
    throw new Error(ERROR_MESSAGES.INVALID_FORMAT);
  }
};

/**
 * Parses a date string into a Date object with timezone handling
 * @param dateString - Date string to parse
 * @param timezone - Source timezone (defaults to DEFAULT_TIMEZONE)
 * @returns Parsed Date object
 * @throws Error if date string or timezone is invalid
 */
export const parseDate = (
  dateString: string,
  timezone: string = DEFAULT_TIMEZONE
): Date => {
  try {
    const parsedDate = dayjs.tz(dateString, timezone);
    
    if (!parsedDate.isValid()) {
      throw new Error(ERROR_MESSAGES.INVALID_DATE);
    }

    return parsedDate.toDate();
  } catch (error) {
    throw new Error(ERROR_MESSAGES.INVALID_FORMAT);
  }
};

/**
 * Calculates the current streak for a habit based on completion dates
 * @param completionDates - Array of completion dates
 * @param frequency - Habit frequency configuration
 * @returns Current streak count
 */
export const calculateStreak = (
  completionDates: Date[],
  frequency: HabitFrequency
): number => {
  if (!completionDates.length) return 0;

  const sortedDates = [...completionDates].sort((a, b) => b.getTime() - a.getTime());
  let streak = 0;
  const today = dayjs().startOf('day');

  const isConsecutive = (date1: Date, date2: Date): boolean => {
    switch (frequency.type) {
      case FrequencyType.DAILY:
        return dayjs(date1).diff(dayjs(date2), 'day') === 1;
      case FrequencyType.WEEKLY:
        return dayjs(date1).diff(dayjs(date2), 'week') === 1;
      case FrequencyType.CUSTOM:
        const nextValidDate = getNextValidDate(date2, frequency);
        return dayjs(date1).isSame(nextValidDate, 'day');
      default:
        return false;
    }
  };

  let currentDate = sortedDates[0];
  streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    if (isConsecutive(currentDate, sortedDates[i])) {
      streak++;
      currentDate = sortedDates[i];
    } else {
      break;
    }
  }

  // Check if streak is still active (last completion was recent enough)
  const lastCompletionDate = dayjs(sortedDates[0]);
  const isStreakActive = isWithinFrequency(lastCompletionDate.toDate(), frequency);

  return isStreakActive ? streak : 0;
};

/**
 * Calculates date range for analytics based on timeframe
 * @param timeframe - Analytics timeframe
 * @returns Object containing start and end dates
 * @throws Error if timeframe is invalid
 */
export const getDateRange = (
  timeframe: AnalyticsTimeframe
): { startDate: Date; endDate: Date } => {
  const endDate = dayjs().endOf('day');
  let startDate: dayjs.Dayjs;

  switch (timeframe) {
    case AnalyticsTimeframe.DAILY:
      startDate = endDate.subtract(1, 'day').startOf('day');
      break;
    case AnalyticsTimeframe.WEEKLY:
      startDate = endDate.subtract(1, 'week').startOf('day');
      break;
    case AnalyticsTimeframe.MONTHLY:
      startDate = endDate.subtract(1, 'month').startOf('day');
      break;
    default:
      throw new Error(ERROR_MESSAGES.INVALID_TIMEFRAME);
  }

  return {
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  };
};

/**
 * Validates if a date meets habit frequency requirements
 * @param date - Date to validate
 * @param frequency - Habit frequency configuration
 * @returns Boolean indicating if date is within frequency requirements
 */
export const isWithinFrequency = (
  date: Date,
  frequency: HabitFrequency
): boolean => {
  if (!date || !frequency) {
    return false;
  }

  const targetDate = dayjs(date);
  const now = dayjs();

  switch (frequency.type) {
    case FrequencyType.DAILY:
      return targetDate.isSame(now, 'day') || 
             targetDate.isSame(now.subtract(1, 'day'), 'day');

    case FrequencyType.WEEKLY:
      return targetDate.isSame(now, 'week') &&
             frequency.days.includes(targetDate.day());

    case FrequencyType.CUSTOM:
      if (!frequency.customSchedule) return false;
      return frequency.customSchedule.days.includes(targetDate.day()) &&
             targetDate.format(DEFAULT_TIME_FORMAT) === frequency.customSchedule.time;

    default:
      return false;
  }
};

/**
 * Helper function to get the next valid date based on frequency
 * @param date - Reference date
 * @param frequency - Habit frequency configuration
 * @returns Next valid date
 */
const getNextValidDate = (
  date: Date,
  frequency: HabitFrequency
): Date => {
  const startDate = dayjs(date);

  switch (frequency.type) {
    case FrequencyType.DAILY:
      return startDate.add(1, 'day').toDate();

    case FrequencyType.WEEKLY:
      const nextWeekDay = frequency.days.find(day => day > startDate.day());
      if (nextWeekDay !== undefined) {
        return startDate.day(nextWeekDay).toDate();
      }
      return startDate.add(1, 'week').day(frequency.days[0]).toDate();

    case FrequencyType.CUSTOM:
      if (!frequency.customSchedule) return startDate.toDate();
      const nextCustomDay = frequency.customSchedule.days.find(
        day => day > startDate.day()
      );
      if (nextCustomDay !== undefined) {
        return startDate.day(nextCustomDay).toDate();
      }
      return startDate.add(1, 'week').day(frequency.customSchedule.days[0]).toDate();

    default:
      return startDate.toDate();
  }
};