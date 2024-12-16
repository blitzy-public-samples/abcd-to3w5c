/**
 * @fileoverview Analytics utility functions for the Habit Tracking Application
 * Provides optimized data processing and visualization utilities with memoization
 * @version 1.0.0
 */

import { memoize } from 'lodash'; // v4.x
import { Chart } from 'chart.js'; // v4.x
import {
  HabitAnalytics,
  AnalyticsTimeframe,
  CompletionStatus,
  TrendDirection,
  AnalyticsChartData,
  HeatmapData,
  ChartDataset
} from '../types/analytics.types';
import { HEATMAP_CONFIG } from '../constants/analytics.constants';
import { getDateRange } from './date.utils';
import { HabitLog } from '../types/habit.types';

/**
 * Type definitions for internal use
 */
interface TrendAnalysis {
  direction: TrendDirection;
  change: number;
}

interface ChartConfiguration {
  type: 'line' | 'bar' | 'radar';
  options?: Chart.ChartOptions;
}

/**
 * Calculates the completion rate for habit logs within a specified timeframe
 * Uses memoization for performance optimization
 * 
 * @param logs - Array of habit completion logs
 * @param timeframe - Time period for analysis
 * @returns Completion rate as a percentage
 */
export const calculateCompletionRate = memoize((
  logs: HabitLog[],
  timeframe: AnalyticsTimeframe
): number => {
  if (!logs || !logs.length) return 0;

  const { startDate, endDate } = getDateRange(timeframe);
  
  // Filter logs within timeframe
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.completedAt);
    return logDate >= startDate && logDate <= endDate;
  });

  // Calculate expected completions based on timeframe
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const expectedCompletions = daysDiff;

  // Calculate actual completions
  const actualCompletions = filteredLogs.length;

  // Calculate and round completion rate to 2 decimal places
  return Math.round((actualCompletions / expectedCompletions) * 10000) / 100;
}, (logs, timeframe) => {
  // Custom cache key generator for memoization
  return `${timeframe}_${logs.length}_${logs[logs.length - 1]?.completedAt}`;
});

/**
 * Generates optimized heatmap data for habit completion visualization
 * Implements efficient data processing with memoization
 * 
 * @param logs - Array of habit completion logs
 * @param startDate - Start date for heatmap
 * @param endDate - End date for heatmap
 * @returns Array of daily completion data with intensity values
 */
export const generateHeatmapData = memoize((
  logs: HabitLog[],
  startDate: Date,
  endDate: Date
): HeatmapData[] => {
  const heatmapData: HeatmapData[] = [];
  const dateMap = new Map<string, number>();

  // Create efficient lookup map for logs
  logs.forEach(log => {
    const dateKey = new Date(log.completedAt).toISOString().split('T')[0];
    dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
  });

  // Generate daily data points
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const completions = dateMap.get(dateKey) || 0;
    
    // Calculate intensity and status
    const intensity = Math.min(completions / HEATMAP_CONFIG.INTENSITY_LEVELS.length, 1);
    const status: CompletionStatus = completions > 0 ? 'completed' : 'missed';

    heatmapData.push({
      date: new Date(currentDate),
      value: intensity,
      status
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return heatmapData;
}, (logs, startDate, endDate) => {
  // Custom cache key for heatmap data
  return `${startDate.toISOString()}_${endDate.toISOString()}_${logs.length}`;
});

/**
 * Formats analytics data for Chart.js visualization with performance optimization
 * 
 * @param analytics - Array of habit analytics data
 * @param type - Chart type configuration
 * @returns Chart.js compatible data structure
 */
export const formatChartData = memoize((
  analytics: HabitAnalytics[],
  type: ChartConfiguration
): AnalyticsChartData => {
  // Extract labels and data points efficiently
  const labels = analytics.map(item => item.habitId);
  
  const datasets: ChartDataset[] = [
    {
      label: 'Completion Rate',
      data: analytics.map(item => item.completionRate),
      backgroundColor: HEATMAP_CONFIG.COLORS.COMPLETED,
      borderColor: HEATMAP_CONFIG.COLORS.COMPLETED
    },
    {
      label: 'Current Streak',
      data: analytics.map(item => item.currentStreak),
      backgroundColor: HEATMAP_CONFIG.COLORS.PARTIAL,
      borderColor: HEATMAP_CONFIG.COLORS.PARTIAL
    }
  ];

  return { labels, datasets };
}, (analytics, type) => {
  // Cache key based on analytics data and chart type
  return `${JSON.stringify(analytics)}_${type.type}`;
});

/**
 * Calculates trend analysis with statistical accuracy and memoization
 * 
 * @param values - Array of numerical values for trend analysis
 * @returns Trend direction and percentage change
 */
export const calculateTrend = memoize((values: number[]): TrendAnalysis => {
  if (!values || values.length < 2) {
    return { direction: 'stable', change: 0 };
  }

  // Calculate moving average for trend smoothing
  const windowSize = Math.min(3, Math.floor(values.length / 2));
  const movingAverages = values.slice(windowSize - 1).map((_, index) => {
    const window = values.slice(index, index + windowSize);
    return window.reduce((sum, val) => sum + val, 0) / windowSize;
  });

  // Calculate trend direction and change
  const firstAvg = movingAverages[0];
  const lastAvg = movingAverages[movingAverages.length - 1];
  const change = ((lastAvg - firstAvg) / firstAvg) * 100;

  // Determine trend direction with threshold
  const TREND_THRESHOLD = 5; // 5% threshold for trend determination
  let direction: TrendDirection = 'stable';
  
  if (Math.abs(change) >= TREND_THRESHOLD) {
    direction = change > 0 ? 'up' : 'down';
  }

  return {
    direction,
    change: Math.round(change * 100) / 100
  };
}, (values) => {
  // Cache key based on values array
  return values.join('_');
});