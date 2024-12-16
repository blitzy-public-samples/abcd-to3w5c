/**
 * @fileoverview High-performance utility functions for calculating and processing habit tracking statistics.
 * Implements optimized algorithms for completion rates, streaks, and trend analysis with memoization
 * and efficient data processing capabilities.
 * 
 * @version 1.0.0
 * @requires dayjs@1.x
 */

import dayjs from 'dayjs'; // v1.x
import { memoize } from 'lodash'; // v4.x
import { 
  HabitAnalytics, 
  AnalyticsTimeframe, 
  WeeklyProgress, 
  HeatmapData, 
  AnalyticsTrend,
  TimeGranularity,
  CompletionStatus,
  TrendDirection 
} from '../interfaces/analytics.interface';
import { formatDate, calculateDateDifference } from '../../../shared/utils/date.util';

// Constants for statistical calculations and optimizations
const TREND_THRESHOLD = 0.05;
const MIN_TREND_DATA_POINTS = 7;
const HEATMAP_DEFAULT_VALUE = 0;
const MEMOIZATION_CACHE_SIZE = 1000;
const CONFIDENCE_THRESHOLD = 0.95;

/**
 * Calculates habit completion rate with memoization for performance optimization
 * @param logs - Array of habit completion logs
 * @param timeframe - Time period for calculation
 * @returns Completion rate as a percentage
 */
export const calculateCompletionRate = memoize((
  logs: Array<{ date: Date; completed: boolean }>,
  timeframe: AnalyticsTimeframe
): number => {
  if (!logs?.length) return 0;

  try {
    const now = dayjs();
    const filteredLogs = logs.filter(log => {
      const logDate = dayjs(log.date);
      switch (timeframe) {
        case AnalyticsTimeframe.DAILY:
          return logDate.isSame(now, 'day');
        case AnalyticsTimeframe.WEEKLY:
          return logDate.isAfter(now.subtract(1, 'week'));
        default:
          return true;
      }
    });

    const totalEntries = filteredLogs.length;
    if (totalEntries === 0) return 0;

    const completedEntries = filteredLogs.filter(log => log.completed).length;
    return Number(((completedEntries / totalEntries) * 100).toFixed(2));
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return 0;
  }
}, (logs, timeframe) => `${JSON.stringify(logs)}-${timeframe}`);

/**
 * Calculates current streak with timezone awareness and enhanced consecutive day tracking
 * @param logs - Array of habit completion logs
 * @returns Current streak count
 */
export const calculateStreak = memoize((
  logs: Array<{ date: Date; completed: boolean }>
): number => {
  if (!logs?.length) return 0;

  try {
    const sortedLogs = [...logs].sort((a, b) => 
      dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    );

    let currentStreak = 0;
    let previousDate = dayjs();

    for (const log of sortedLogs) {
      const logDate = dayjs(log.date);
      const dayDiff = calculateDateDifference(logDate.toDate(), previousDate.toDate(), 'days');

      if (!log.completed || dayDiff > 1) break;
      currentStreak++;
      previousDate = logDate;
    }

    return currentStreak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
});

/**
 * Generates heatmap data with intensity calculations and optimized date handling
 * @param logs - Array of habit completion logs
 * @param startDate - Start date for heatmap
 * @param endDate - End date for heatmap
 * @returns Array of heatmap data points
 */
export const generateHeatmapData = (
  logs: Array<{ date: Date; completed: boolean; status?: CompletionStatus }>,
  startDate: Date,
  endDate: Date
): HeatmapData[] => {
  try {
    const heatmapData: HeatmapData[] = [];
    let currentDate = dayjs(startDate);
    const end = dayjs(endDate);

    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      const dateStr = formatDate(currentDate.toDate());
      const dayLogs = logs.filter(log => 
        formatDate(log.date) === dateStr
      );

      const completionRate = dayLogs.length ? 
        dayLogs.filter(log => log.completed).length / dayLogs.length : 
        HEATMAP_DEFAULT_VALUE;

      const status: CompletionStatus = completionRate === 1 ? 'completed' :
        completionRate > 0 ? 'partial' : 'missed';

      heatmapData.push({
        date: currentDate.toDate(),
        value: completionRate,
        status,
        intensity: Math.min(Math.max(completionRate, 0), 1)
      });

      currentDate = currentDate.add(1, 'day');
    }

    return heatmapData;
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return [];
  }
};

/**
 * Calculates trend analysis with confidence scoring and statistical significance
 * @param values - Array of numerical values for trend analysis
 * @param granularity - Time granularity for trend calculation
 * @returns Trend analysis with confidence score
 */
export const calculateTrend = (
  values: number[],
  granularity: TimeGranularity
): AnalyticsTrend => {
  try {
    if (values.length < MIN_TREND_DATA_POINTS) {
      throw new Error(`Insufficient data points for trend analysis. Minimum required: ${MIN_TREND_DATA_POINTS}`);
    }

    const recentValues = values.slice(-MIN_TREND_DATA_POINTS);
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const previousAverage = values.slice(-MIN_TREND_DATA_POINTS * 2, -MIN_TREND_DATA_POINTS)
      .reduce((sum, val) => sum + val, 0) / MIN_TREND_DATA_POINTS;

    const change = ((average - previousAverage) / previousAverage) * 100;
    const direction: TrendDirection = Math.abs(change) < TREND_THRESHOLD ? 'stable' :
      change > 0 ? 'up' : 'down';

    // Calculate confidence score using standard deviation
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / recentValues.length
    );
    const confidence = Math.min(1 - (stdDev / average), CONFIDENCE_THRESHOLD);

    return {
      period: formatDate(new Date(), 'YYYY-[W]WW'),
      value: average,
      change: Number(change.toFixed(2)),
      trend: direction,
      confidence: Number(confidence.toFixed(2)),
      metadata: {
        granularity,
        dataPoints: values.length,
        standardDeviation: stdDev
      }
    };
  } catch (error) {
    console.error('Error calculating trend:', error);
    return {
      period: formatDate(new Date(), 'YYYY-[W]WW'),
      value: 0,
      change: 0,
      trend: 'stable',
      confidence: 0,
      metadata: {
        error: (error as Error).message
      }
    };
  }
};

/**
 * Calculates weekly progress with detailed status tracking and optimized grouping
 * @param logs - Array of habit completion logs
 * @returns Weekly progress statistics
 */
export const calculateWeeklyProgress = memoize((
  logs: Array<{ date: Date; completed: boolean; status?: CompletionStatus }>
): WeeklyProgress => {
  try {
    const currentDate = dayjs();
    const weekStart = currentDate.startOf('week');
    const weekLogs = logs.filter(log => 
      dayjs(log.date).isAfter(weekStart) || dayjs(log.date).isSame(weekStart, 'day')
    );

    const dailyStatus: CompletionStatus[] = Array(7).fill('missed');
    let completedDays = 0;

    weekLogs.forEach(log => {
      const dayIndex = dayjs(log.date).day();
      if (log.completed) {
        dailyStatus[dayIndex] = 'completed';
        completedDays++;
      } else if (log.status === 'partial') {
        dailyStatus[dayIndex] = 'partial';
      }
    });

    return {
      week: currentDate.week(),
      completedDays,
      totalDays: 7,
      rate: Number(((completedDays / 7) * 100).toFixed(2)),
      dailyStatus
    };
  } catch (error) {
    console.error('Error calculating weekly progress:', error);
    return {
      week: dayjs().week(),
      completedDays: 0,
      totalDays: 7,
      rate: 0,
      dailyStatus: Array(7).fill('missed')
    };
  }
});