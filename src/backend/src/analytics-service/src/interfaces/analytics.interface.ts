/**
 * @fileoverview Defines comprehensive interfaces and types for the analytics microservice,
 * providing robust type definitions for habit tracking statistics, user analytics,
 * trend analysis, and data visualization components.
 * 
 * @version 1.0.0
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Defines standard time periods for analytics calculations and reporting
 */
export enum AnalyticsTimeframe {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

/**
 * Specifies granularity levels for trend analysis and data aggregation
 */
export enum TimeGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

/**
 * Extended type for granular habit completion status tracking
 */
export type CompletionStatus = 'completed' | 'partial' | 'missed' | 'skipped';

/**
 * Enhanced type for trend direction indicators with volatility tracking
 */
export type TrendDirection = 'up' | 'down' | 'stable' | 'volatile';

/**
 * Detailed interface for weekly habit progress tracking
 */
export interface WeeklyProgress {
  /** Week number in the year (1-52) */
  week: number;
  /** Number of days where habit was completed */
  completedDays: number;
  /** Total number of days in the tracking period */
  totalDays: number;
  /** Completion rate as a percentage */
  rate: number;
  /** Daily completion status for the week */
  dailyStatus: CompletionStatus[];
}

/**
 * Interface for habit completion heatmap visualization
 */
export interface HeatmapData {
  /** Date of the completion record */
  date: Date;
  /** Numerical value for completion (0-1) */
  value: number;
  /** Completion status for the day */
  status: CompletionStatus;
  /** Visual intensity for heatmap (0-1) */
  intensity: number;
}

/**
 * Comprehensive interface for trend analysis data
 */
export interface AnalyticsTrend {
  /** Time period for the trend (e.g., "2023-W45") */
  period: string;
  /** Numerical value for the metric */
  value: number;
  /** Percentage change from previous period */
  change: number;
  /** Direction of the trend */
  trend: TrendDirection;
  /** Statistical confidence level (0-1) */
  confidence: number;
  /** Additional metadata for the trend */
  metadata: Record<string, unknown>;
}

/**
 * Comprehensive analytics data structure for individual habits
 * including trends and visualizations
 */
export interface HabitAnalytics extends BaseEntity {
  /** Reference to the associated habit */
  habitId: string;
  /** Overall completion rate (0-100) */
  completionRate: number;
  /** Current consecutive completion streak */
  currentStreak: number;
  /** Longest achieved streak */
  longestStreak: number;
  /** Weekly progress tracking data */
  weeklyProgress: WeeklyProgress[];
  /** Trend analysis data */
  trends: AnalyticsTrend[];
  /** Heatmap visualization data */
  heatmapData: HeatmapData[];
}

/**
 * Aggregated analytics data per user with detailed habit statistics and trends
 */
export interface UserAnalytics extends BaseEntity {
  /** Reference to the associated user */
  userId: string;
  /** Total number of habits created */
  totalHabits: number;
  /** Number of currently active habits */
  activeHabits: number;
  /** Overall completion rate across all habits (0-100) */
  overallCompletionRate: number;
  /** Trend analysis data for user performance */
  trends: AnalyticsTrend[];
  /** Detailed analytics for each habit */
  habitAnalytics: HabitAnalytics[];
}

/**
 * Interface for analytics performance metrics
 */
export interface AnalyticsMetrics {
  /** Average calculation time in milliseconds */
  calculationTime: number;
  /** Data points processed */
  dataPoints: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Query execution time in milliseconds */
  queryTime: number;
}

/**
 * Interface for analytics export configuration
 */
export interface AnalyticsExportConfig {
  /** Time range for the export */
  timeframe: AnalyticsTimeframe;
  /** Data granularity level */
  granularity: TimeGranularity;
  /** Specific metrics to include */
  metrics: string[];
  /** Export format (csv, json, etc.) */
  format: string;
  /** Include raw data flag */
  includeRawData: boolean;
}