/**
 * @fileoverview Analytics type definitions for the Habit Tracking Application
 * @version 1.0.0
 */

/**
 * Time periods available for analytics calculations
 */
export enum AnalyticsTimeframe {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

/**
 * Granularity levels for trend analysis
 */
export enum TimeGranularity {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

/**
 * Status indicators for habit completion
 */
export type CompletionStatus = 'completed' | 'partial' | 'missed';

/**
 * Direction indicators for analytics trends
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Chart.js compatible dataset structure
 */
export type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
};

/**
 * Weekly progress tracking interface
 */
export interface WeeklyProgress {
  week: number;
  completedDays: number;
  totalDays: number;
  rate: number;
}

/**
 * Heatmap data visualization interface
 */
export interface HeatmapData {
  date: Date;
  value: number;
  status: CompletionStatus;
}

/**
 * Trend analysis data interface
 */
export interface AnalyticsTrend {
  period: string;
  value: number;
  change: number;
  trend: TrendDirection;
}

/**
 * Chart.js compatible data structure interface
 */
export interface AnalyticsChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Analytics data for individual habits
 */
export interface HabitAnalytics {
  habitId: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: WeeklyProgress;
}

/**
 * Aggregated user analytics data
 */
export interface UserAnalytics {
  userId: string;
  totalHabits: number;
  activeHabits: number;
  overallCompletionRate: number;
  trends: AnalyticsTrend[];
}