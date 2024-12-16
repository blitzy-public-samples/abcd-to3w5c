/**
 * @fileoverview Redux Toolkit slice for managing analytics state in the frontend application
 * @version 1.0.0
 * @license MIT
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'; // v1.9.x
import {
  HabitAnalytics,
  UserAnalytics,
  AnalyticsTimeframe,
  TimeGranularity,
  AnalyticsError
} from '../types/analytics.types';
import {
  getUserAnalytics,
  getHabitAnalytics,
  getTrendAnalytics,
  getCompletionHeatmap
} from '../api/analytics.api';
import {
  ANALYTICS_CACHE_DURATION,
  TimeGranularity as TimeGranularityEnum
} from '../constants/analytics.constants';

// Types for the analytics state
interface PendingAnalyticsRequest {
  type: string;
  params: Record<string, any>;
  timestamp: number;
}

interface AnalyticsState {
  userAnalytics: UserAnalytics | null;
  habitAnalytics: Record<string, HabitAnalytics>;
  loadingStates: Record<string, boolean>;
  errors: Record<string, AnalyticsError | null>;
  lastUpdated: Record<string, number>;
  retryAttempts: Record<string, number>;
  offlineQueue: PendingAnalyticsRequest[];
}

// Initial state
const initialState: AnalyticsState = {
  userAnalytics: null,
  habitAnalytics: {},
  loadingStates: {},
  errors: {},
  lastUpdated: {},
  retryAttempts: {},
  offlineQueue: []
};

// Helper function to generate cache keys
const getCacheKey = (type: string, params: Record<string, any>): string => {
  return `${type}:${JSON.stringify(params)}`;
};

// Async thunks for fetching analytics data
export const fetchUserAnalytics = createAsyncThunk(
  'analytics/fetchUserAnalytics',
  async (
    { timeframe, forceRefresh = false }: { timeframe: AnalyticsTimeframe; forceRefresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    const cacheKey = getCacheKey('userAnalytics', { timeframe });
    const state = getState() as { analytics: AnalyticsState };
    
    // Check cache validity unless force refresh is requested
    if (!forceRefresh && state.analytics.lastUpdated[cacheKey]) {
      const cacheAge = Date.now() - state.analytics.lastUpdated[cacheKey];
      if (cacheAge < ANALYTICS_CACHE_DURATION) {
        return state.analytics.userAnalytics;
      }
    }

    try {
      const data = await getUserAnalytics(timeframe);
      return data;
    } catch (error) {
      return rejectWithValue({
        code: (error as any).code || 500,
        message: (error as any).message || 'Failed to fetch user analytics',
        details: error
      });
    }
  }
);

export const fetchHabitAnalytics = createAsyncThunk(
  'analytics/fetchHabitAnalytics',
  async (
    {
      habitId,
      timeframe,
      forceRefresh = false
    }: {
      habitId: string;
      timeframe: AnalyticsTimeframe;
      forceRefresh?: boolean;
    },
    { getState, rejectWithValue }
  ) => {
    const cacheKey = getCacheKey('habitAnalytics', { habitId, timeframe });
    const state = getState() as { analytics: AnalyticsState };

    if (!forceRefresh && state.analytics.lastUpdated[cacheKey]) {
      const cacheAge = Date.now() - state.analytics.lastUpdated[cacheKey];
      if (cacheAge < ANALYTICS_CACHE_DURATION) {
        return state.analytics.habitAnalytics[habitId];
      }
    }

    try {
      const data = await getHabitAnalytics(habitId, timeframe);
      return { habitId, data };
    } catch (error) {
      return rejectWithValue({
        code: (error as any).code || 500,
        message: (error as any).message || 'Failed to fetch habit analytics',
        details: error
      });
    }
  }
);

// Create the analytics slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalyticsErrors: (state) => {
      state.errors = {};
    },
    clearAnalyticsCache: (state) => {
      state.lastUpdated = {};
    },
    queueOfflineRequest: (state, action) => {
      state.offlineQueue.push({
        ...action.payload,
        timestamp: Date.now()
      });
    }
  },
  extraReducers: (builder) => {
    // User Analytics
    builder
      .addCase(fetchUserAnalytics.pending, (state, action) => {
        const cacheKey = getCacheKey('userAnalytics', action.meta.arg);
        state.loadingStates[cacheKey] = true;
        state.errors[cacheKey] = null;
      })
      .addCase(fetchUserAnalytics.fulfilled, (state, action) => {
        const cacheKey = getCacheKey('userAnalytics', action.meta.arg);
        state.userAnalytics = action.payload;
        state.loadingStates[cacheKey] = false;
        state.lastUpdated[cacheKey] = Date.now();
        state.retryAttempts[cacheKey] = 0;
      })
      .addCase(fetchUserAnalytics.rejected, (state, action) => {
        const cacheKey = getCacheKey('userAnalytics', action.meta.arg);
        state.loadingStates[cacheKey] = false;
        state.errors[cacheKey] = action.payload as AnalyticsError;
        state.retryAttempts[cacheKey] = (state.retryAttempts[cacheKey] || 0) + 1;
      });

    // Habit Analytics
    builder
      .addCase(fetchHabitAnalytics.pending, (state, action) => {
        const cacheKey = getCacheKey('habitAnalytics', action.meta.arg);
        state.loadingStates[cacheKey] = true;
        state.errors[cacheKey] = null;
      })
      .addCase(fetchHabitAnalytics.fulfilled, (state, action) => {
        const { habitId, data } = action.payload;
        const cacheKey = getCacheKey('habitAnalytics', action.meta.arg);
        state.habitAnalytics[habitId] = data;
        state.loadingStates[cacheKey] = false;
        state.lastUpdated[cacheKey] = Date.now();
        state.retryAttempts[cacheKey] = 0;
      })
      .addCase(fetchHabitAnalytics.rejected, (state, action) => {
        const cacheKey = getCacheKey('habitAnalytics', action.meta.arg);
        state.loadingStates[cacheKey] = false;
        state.errors[cacheKey] = action.payload as AnalyticsError;
        state.retryAttempts[cacheKey] = (state.retryAttempts[cacheKey] || 0) + 1;
      });
  }
});

// Export actions
export const {
  clearAnalyticsErrors,
  clearAnalyticsCache,
  queueOfflineRequest
} = analyticsSlice.actions;

// Memoized selectors
export const selectUserAnalytics = createSelector(
  [(state: { analytics: AnalyticsState }) => state.analytics],
  (analytics) => analytics.userAnalytics
);

export const selectHabitAnalytics = createSelector(
  [(state: { analytics: AnalyticsState }) => state.analytics, (_: any, habitId: string) => habitId],
  (analytics, habitId) => analytics.habitAnalytics[habitId]
);

export const selectAnalyticsError = createSelector(
  [(state: { analytics: AnalyticsState }) => state.analytics, (_: any, cacheKey: string) => cacheKey],
  (analytics, cacheKey) => analytics.errors[cacheKey]
);

export const selectIsAnalyticsLoading = createSelector(
  [(state: { analytics: AnalyticsState }) => state.analytics, (_: any, cacheKey: string) => cacheKey],
  (analytics, cacheKey) => analytics.loadingStates[cacheKey] || false
);

// Export reducer
export default analyticsSlice.reducer;