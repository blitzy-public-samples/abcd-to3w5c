/**
 * @fileoverview Comprehensive date manipulation utilities with timezone support,
 * memoization optimization, and enhanced validation for the habit tracking application.
 * 
 * @version 1.0.0
 * @requires dayjs@1.x
 * @requires lodash@4.x
 */

import dayjs from 'dayjs'; // v1.x
import utc from 'dayjs/plugin/utc'; // v1.x
import timezone from 'dayjs/plugin/timezone'; // v1.x
import { memoize } from 'lodash'; // v4.x
import { BaseEntity } from '../interfaces/base.interface';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Constants
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIMEZONE = 'UTC';
export const ALLOWED_UNITS = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'] as const;
type DateUnit = typeof ALLOWED_UNITS[number];

/**
 * Validates if the provided date is valid
 * @param date - Date to validate
 * @returns boolean indicating if date is valid
 */
const isValidDate = (date: Date | string | number): boolean => {
  const dayjsDate = dayjs(date);
  return dayjsDate.isValid() && !isNaN(dayjsDate.valueOf());
};

/**
 * Validates if the provided timezone is a valid IANA timezone
 * @param timezone - Timezone string to validate
 * @returns boolean indicating if timezone is valid
 */
const isValidTimezone = (timezone: string): boolean => {
  try {
    dayjs().tz(timezone);
    return true;
  } catch {
    return false;
  }
};

/**
 * Formats a date into a standardized string format with enhanced validation
 * @param date - Date to format
 * @param format - Output format (defaults to DEFAULT_DATE_FORMAT)
 * @param timezone - Target timezone (defaults to DEFAULT_TIMEZONE)
 * @throws Error if date is invalid or timezone is unsupported
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  format: string = DEFAULT_DATE_FORMAT,
  timezone: string = DEFAULT_TIMEZONE
): string => {
  if (!isValidDate(date)) {
    throw new Error('Invalid date provided');
  }

  if (!isValidTimezone(timezone)) {
    throw new Error(`Unsupported timezone: ${timezone}`);
  }

  try {
    return dayjs(date).tz(timezone).format(format);
  } catch (error) {
    throw new Error(`Error formatting date: ${(error as Error).message}`);
  }
};

/**
 * Parses a date string into a Date object with strict validation
 * @param dateString - String representation of date
 * @param format - Expected input format (optional)
 * @throws Error if parsing fails or results in invalid date
 * @returns Parsed Date object
 */
export const parseDate = (dateString: string, format?: string): Date => {
  const parsedDate = format 
    ? dayjs(dateString, format, true)
    : dayjs(dateString);

  if (!parsedDate.isValid()) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  return parsedDate.toDate();
};

/**
 * Converts UTC date to user's timezone with DST handling
 * Memoized for performance optimization
 * @param date - UTC date to convert
 * @param timezone - Target timezone
 * @throws Error if timezone is invalid or conversion fails
 * @returns Date in user's timezone
 */
export const convertToUserTimezone = memoize(
  (date: Date, timezone: string): Date => {
    if (!isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    try {
      const utcDate = dayjs(date).utc();
      return utcDate.tz(timezone).toDate();
    } catch (error) {
      throw new Error(`Timezone conversion failed: ${(error as Error).message}`);
    }
  },
  (date: Date, timezone: string) => `${date.getTime()}-${timezone}`
);

/**
 * Calculates difference between dates with multiple unit support
 * @param startDate - Start date for calculation
 * @param endDate - End date for calculation
 * @param unit - Unit for difference calculation
 * @throws Error if dates are invalid or unit is unsupported
 * @returns Difference in specified unit
 */
export const calculateDateDifference = (
  startDate: Date,
  endDate: Date,
  unit: DateUnit
): number => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error('Invalid date provided for difference calculation');
  }

  if (!ALLOWED_UNITS.includes(unit)) {
    throw new Error(`Unsupported unit: ${unit}. Allowed units: ${ALLOWED_UNITS.join(', ')}`);
  }

  try {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return end.diff(start, unit);
  } catch (error) {
    throw new Error(`Error calculating date difference: ${(error as Error).message}`);
  }
};

/**
 * Checks if a date is within a DST period for a given timezone
 * @param date - Date to check
 * @param timezone - Timezone to check DST status
 * @returns boolean indicating if date is in DST
 */
export const isDST = (date: Date, timezone: string): boolean => {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  return dayjs(date).tz(timezone).isDST();
};

/**
 * Gets the start of a time unit for a given date
 * @param date - Date to process
 * @param unit - Time unit (day, week, month, year)
 * @param timezone - Timezone to use for calculation
 * @returns Date object representing start of the unit
 */
export const getStartOf = (
  date: Date,
  unit: 'day' | 'week' | 'month' | 'year',
  timezone: string = DEFAULT_TIMEZONE
): Date => {
  if (!isValidDate(date)) {
    throw new Error('Invalid date provided');
  }

  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  return dayjs(date).tz(timezone).startOf(unit).toDate();
};

/**
 * Validates and normalizes entity dates (createdAt, updatedAt)
 * @param entity - Entity with date fields
 * @throws Error if dates are invalid or in wrong order
 * @returns Validated entity
 */
export const validateEntityDates = <T extends BaseEntity>(entity: T): T => {
  if (!isValidDate(entity.createdAt) || !isValidDate(entity.updatedAt)) {
    throw new Error('Invalid entity dates');
  }

  if (entity.updatedAt < entity.createdAt) {
    throw new Error('Updated date cannot be before created date');
  }

  return entity;
};