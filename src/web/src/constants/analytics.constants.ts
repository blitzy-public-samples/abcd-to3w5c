/**
 * @fileoverview Analytics constants and configuration values for the Habit Tracking Application.
 * Provides type-safe constants for analytics visualization, data processing, and API integration.
 * @version 1.0.0
 */

/**
 * Time granularity options for analytics data aggregation.
 * Used to specify the time interval for data analysis and visualization.
 */
export enum TimeGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

/**
 * API endpoint paths for analytics data retrieval.
 * Type-safe constant object containing all analytics-related API endpoints.
 */
export const AnalyticsEndpoints = {
  USER_ANALYTICS: '/analytics/user',
  HABIT_ANALYTICS: '/analytics/habits',
  TRENDS: '/analytics/trends',
  STREAKS: '/analytics/streaks'
} as const;

/**
 * Cache duration for analytics data in milliseconds (5 minutes).
 * Used to optimize performance and reduce API calls for frequently accessed analytics data.
 */
export const ANALYTICS_CACHE_DURATION = 300000 as const;

/**
 * Configuration for habit completion heatmap visualization.
 * Includes color schemes, intensity levels, and accessibility labels.
 */
export const HEATMAP_CONFIG = {
  COLORS: {
    COMPLETED: '#34D399', // Success green
    PARTIAL: '#FCD34D',   // Warning yellow
    MISSED: '#F87171',    // Error red
    EMPTY: '#E5E7EB'      // Neutral gray
  },
  INTENSITY_LEVELS: [0, 0.25, 0.5, 0.75, 1] as const,
  CELL_SIZE: 32,
  ACCESSIBILITY: {
    COMPLETED_LABEL: 'Completed',
    PARTIAL_LABEL: 'Partially Completed',
    MISSED_LABEL: 'Missed',
    EMPTY_LABEL: 'No Data'
  }
} as const;

/**
 * Default chart configuration values for consistent visualization.
 * Provides standardized settings for all analytics charts.
 */
export const CHART_DEFAULTS = {
  LINE_TENSION: 0.4,
  POINT_RADIUS: 4,
  ANIMATION_DURATION: 750,
  RESPONSIVE: true,
  FONT_FAMILY: "'Inter', sans-serif",
  GRID_COLOR: '#E5E7EB',
  TOOLTIP_ENABLED: true
} as const;

/**
 * Type definitions for analytics data structures
 */
export type AnalyticsEndpoint = typeof AnalyticsEndpoints[keyof typeof AnalyticsEndpoints];
export type HeatmapColor = typeof HEATMAP_CONFIG.COLORS[keyof typeof HEATMAP_CONFIG.COLORS];
export type HeatmapIntensity = typeof HEATMAP_CONFIG.INTENSITY_LEVELS[number];

/**
 * Type guard for validating time granularity values
 */
export const isValidTimeGranularity = (value: string): value is TimeGranularity => {
  return Object.values(TimeGranularity).includes(value as TimeGranularity);
};

/**
 * Type guard for validating heatmap colors
 */
export const isValidHeatmapColor = (color: string): color is HeatmapColor => {
  return Object.values(HEATMAP_CONFIG.COLORS).includes(color as HeatmapColor);
};