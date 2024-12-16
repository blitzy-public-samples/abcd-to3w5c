/**
 * @fileoverview Custom React hook for managing analytics data with enhanced error handling and performance optimizations
 * @version 1.0.0
 * @license MIT
 */

import { useCallback, useState, useEffect, useRef } from 'react'; // v18.0.0
import { useDispatch, useSelector } from 'react-redux'; // v8.0.0
import {
  fetchHabitAnalytics,
  fetchUserAnalytics,
  fetchHeatmapData,
  selectUserAnalytics,
  selectHabitAnalytics,
  selectAnalyticsError,
  selectIsAnalyticsLoading
} from '../store/analytics.slice';
import {
  HabitAnalytics,
  UserAnalytics,
  HeatmapData,
  AnalyticsTimeframe
} from '../types/analytics.types';
import { ANALYTICS_CACHE_DURATION } from '../constants/analytics.constants';

/**
 * Interface for the analytics hook configuration
 */
interface AnalyticsHookConfig {
  refreshInterval?: number;
  maxRetries?: number;
  cacheTimeout?: number;
}

/**
 * Interface for granular loading states
 */
interface LoadingStates {
  habitAnalytics: boolean;
  userAnalytics: boolean;
  heatmapData: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AnalyticsHookConfig> = {
  refreshInterval: 300000, // 5 minutes
  maxRetries: 3,
  cacheTimeout: ANALYTICS_CACHE_DURATION
};

/**
 * Custom hook for managing analytics data with enhanced features
 * @param config - Optional configuration for the analytics hook
 * @returns Object containing analytics state and functions
 */
export const useAnalytics = (config: AnalyticsHookConfig = {}) => {
  const dispatch = useDispatch();
  const hookConfig = { ...DEFAULT_CONFIG, ...config };

  // Local state management
  const [loading, setLoading] = useState<LoadingStates>({
    habitAnalytics: false,
    userAnalytics: false,
    heatmapData: false
  });
  const [error, setError] = useState<Error | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<Record<string, number>>({});

  // Redux selectors
  const userAnalytics = useSelector(selectUserAnalytics);
  const habitAnalytics = useSelector(selectHabitAnalytics);
  const analyticsError = useSelector(selectAnalyticsError);
  const isLoading = useSelector(selectIsAnalyticsLoading);

  /**
   * Handles error processing and retry logic
   * @param operation - Name of the operation that failed
   * @param error - Error object
   * @param retryFn - Function to retry the operation
   */
  const handleError = useCallback(async (
    operation: keyof LoadingStates,
    error: Error,
    retryFn: () => Promise<void>
  ) => {
    const retryCount = retryCountRef.current[operation] || 0;
    
    if (retryCount < hookConfig.maxRetries) {
      retryCountRef.current[operation] = retryCount + 1;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryFn();
    }

    setError(error);
    setLoading(prev => ({ ...prev, [operation]: false }));
  }, [hookConfig.maxRetries]);

  /**
   * Fetches habit analytics data with retry logic
   * @param habitId - ID of the habit to fetch analytics for
   * @param timeframe - Time period for analytics calculation
   * @param forceRefresh - Force refresh cached data
   */
  const fetchHabitData = useCallback(async (
    habitId: string,
    timeframe: AnalyticsTimeframe,
    forceRefresh = false
  ) => {
    try {
      setLoading(prev => ({ ...prev, habitAnalytics: true }));
      setError(null);

      await dispatch(fetchHabitAnalytics({ habitId, timeframe, forceRefresh })).unwrap();
    } catch (err) {
      await handleError(
        'habitAnalytics',
        err as Error,
        () => fetchHabitData(habitId, timeframe, forceRefresh)
      );
    } finally {
      setLoading(prev => ({ ...prev, habitAnalytics: false }));
    }
  }, [dispatch, handleError]);

  /**
   * Fetches user analytics data with caching
   * @param timeframe - Time period for analytics calculation
   * @param forceRefresh - Force refresh cached data
   */
  const fetchUserData = useCallback(async (
    timeframe: AnalyticsTimeframe,
    forceRefresh = false
  ) => {
    try {
      setLoading(prev => ({ ...prev, userAnalytics: true }));
      setError(null);

      await dispatch(fetchUserAnalytics({ timeframe, forceRefresh })).unwrap();
    } catch (err) {
      await handleError(
        'userAnalytics',
        err as Error,
        () => fetchUserData(timeframe, forceRefresh)
      );
    } finally {
      setLoading(prev => ({ ...prev, userAnalytics: false }));
    }
  }, [dispatch, handleError]);

  /**
   * Fetches heatmap visualization data
   * @param timeframe - Time period for heatmap data
   * @param forceRefresh - Force refresh cached data
   */
  const fetchHeatmap = useCallback(async (
    timeframe: AnalyticsTimeframe,
    forceRefresh = false
  ) => {
    try {
      setLoading(prev => ({ ...prev, heatmapData: true }));
      setError(null);

      await dispatch(fetchHeatmapData({ timeframe, forceRefresh })).unwrap();
    } catch (err) {
      await handleError(
        'heatmapData',
        err as Error,
        () => fetchHeatmap(timeframe, forceRefresh)
      );
    } finally {
      setLoading(prev => ({ ...prev, heatmapData: false }));
    }
  }, [dispatch, handleError]);

  /**
   * Sets up automatic refresh interval
   * @param interval - Refresh interval in milliseconds
   */
  const setRefreshInterval = useCallback((interval: number) => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    if (interval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchUserData(AnalyticsTimeframe.DAILY, true);
      }, interval);
    }
  }, [fetchUserData]);

  /**
   * Clears analytics cache and forces data refresh
   */
  const clearCache = useCallback(async () => {
    try {
      await Promise.all([
        fetchUserData(AnalyticsTimeframe.DAILY, true),
        fetchHeatmap(AnalyticsTimeframe.DAILY, true)
      ]);
    } catch (err) {
      setError(err as Error);
    }
  }, [fetchUserData, fetchHeatmap]);

  // Setup refresh interval on mount
  useEffect(() => {
    if (hookConfig.refreshInterval > 0) {
      setRefreshInterval(hookConfig.refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [hookConfig.refreshInterval, setRefreshInterval]);

  return {
    // State
    habitAnalytics,
    userAnalytics,
    heatmapData: [], // Placeholder for heatmap data from Redux store
    loading,
    error,

    // Actions
    fetchHabitData,
    fetchUserData,
    fetchHeatmap,
    setRefreshInterval,
    clearCache
  };
};