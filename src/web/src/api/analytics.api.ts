/**
 * @fileoverview Analytics API client implementation for habit tracking analytics
 * @version 1.0.0
 * @license MIT
 */

import { AxiosError } from 'axios'; // v1.x
import { apiClient } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import {
  HabitAnalytics,
  UserAnalytics,
  AnalyticsTimeframe,
  TimeGranularity,
  AnalyticsTrend,
  HeatmapData
} from '../types/analytics.types';

// Cache configuration
const ANALYTICS_CACHE_TTL = 300000; // 5 minutes in milliseconds
const ANALYTICS_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
} as const;

// In-memory cache implementation
const analyticsCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Manages the analytics cache operations
 */
const cacheManager = {
  getCacheKey: (endpoint: string, params: Record<string, any>): string => {
    return `${endpoint}:${JSON.stringify(params)}`;
  },

  get: <T>(key: string): T | null => {
    const cached = analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL) {
      return cached.data as T;
    }
    analyticsCache.delete(key);
    return null;
  },

  set: <T>(key: string, data: T): void => {
    analyticsCache.set(key, { data, timestamp: Date.now() });
  }
};

/**
 * Retrieves aggregated analytics data for the current user
 * @param timeframe - Time period for analytics calculation
 * @returns Promise resolving to user analytics data
 */
export async function getUserAnalytics(
  timeframe: AnalyticsTimeframe
): Promise<UserAnalytics> {
  const cacheKey = cacheManager.getCacheKey('userAnalytics', { timeframe });
  const cachedData = cacheManager.get<UserAnalytics>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await apiClient.get<UserAnalytics>(
      `${API_ENDPOINTS.ANALYTICS.SUMMARY}?timeframe=${timeframe}`
    );

    if (response.success && response.data) {
      cacheManager.set(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      code: axiosError.response?.status || 500,
      message: 'Failed to fetch user analytics',
      details: axiosError.message
    };
  }
}

/**
 * Fetches analytics data for a specific habit
 * @param habitId - Unique identifier of the habit
 * @param timeframe - Time period for analytics calculation
 * @returns Promise resolving to habit-specific analytics
 */
export async function getHabitAnalytics(
  habitId: string,
  timeframe: AnalyticsTimeframe
): Promise<HabitAnalytics> {
  const cacheKey = cacheManager.getCacheKey('habitAnalytics', { habitId, timeframe });
  const cachedData = cacheManager.get<HabitAnalytics>(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await apiClient.get<HabitAnalytics>(
      `${API_ENDPOINTS.ANALYTICS.BASE}/habits/${habitId}?timeframe=${timeframe}`
    );

    if (response.success && response.data) {
      cacheManager.set(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      code: axiosError.response?.status || 500,
      message: 'Failed to fetch habit analytics',
      details: axiosError.message
    };
  }
}

/**
 * Retrieves trend analysis data with progressive loading support
 * @param granularity - Time granularity for trend analysis
 * @param startDate - Start date for trend analysis
 * @param endDate - End date for trend analysis
 * @returns Promise resolving to array of trend data points
 */
export async function getTrendAnalytics(
  granularity: TimeGranularity,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsTrend[]> {
  const cacheKey = cacheManager.getCacheKey('trendAnalytics', {
    granularity,
    startDate,
    endDate
  });
  const cachedData = cacheManager.get<AnalyticsTrend[]>(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await apiClient.get<AnalyticsTrend[]>(
      `${API_ENDPOINTS.ANALYTICS.TRENDS}`,
      {
        params: {
          granularity,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    );

    if (response.success && Array.isArray(response.data)) {
      cacheManager.set(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      code: axiosError.response?.status || 500,
      message: 'Failed to fetch trend analytics',
      details: axiosError.message
    };
  }
}

/**
 * Fetches habit completion data for heatmap visualization
 * @param habitId - Unique identifier of the habit
 * @param year - Year for heatmap data
 * @param month - Month for heatmap data
 * @returns Promise resolving to array of daily completion data
 */
export async function getCompletionHeatmap(
  habitId: string,
  year: number,
  month: number
): Promise<HeatmapData[]> {
  const cacheKey = cacheManager.getCacheKey('heatmapData', {
    habitId,
    year,
    month
  });
  const cachedData = cacheManager.get<HeatmapData[]>(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await apiClient.get<HeatmapData[]>(
      `${API_ENDPOINTS.ANALYTICS.BASE}/habits/${habitId}/heatmap`,
      {
        params: {
          year,
          month
        }
      }
    );

    if (response.success && Array.isArray(response.data)) {
      // Ensure all dates are properly parsed
      const processedData = response.data.map(item => ({
        ...item,
        date: new Date(item.date)
      }));
      
      cacheManager.set(cacheKey, processedData);
      return processedData;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      code: axiosError.response?.status || 500,
      message: 'Failed to fetch heatmap data',
      details: axiosError.message
    };
  }
}