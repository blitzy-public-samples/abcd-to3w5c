/**
 * @fileoverview Centralized API client exports for frontend-backend communication
 * Provides unified access to authentication, habit management, and analytics functionality
 * with TypeScript support and proper domain separation.
 * @version 1.0.0
 * @license MIT
 */

// Authentication API exports
// @auth0/auth0-spa-js version: ^2.1.0
export { authApi } from './auth.api';
export type {
  AuthProvider,
  TokenType,
  AuthError,
  AuthScope,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthState,
  AuthToken,
  AuthResponse,
  Auth0UserMapping,
  TokenValidation,
  AuthConfig
} from '../types/auth.types';

// Habits API exports
export { habitsApi } from './habits.api';
export type {
  Habit,
  HabitFrequency,
  HabitLog,
  HabitStreak,
  HabitStatistics,
  CreateHabitPayload,
  UpdateHabitPayload
} from '../types/habit.types';
export {
  FrequencyType,
  HabitStatus,
  isCustomFrequency,
  isActiveHabit
} from '../types/habit.types';

// Analytics API exports
export {
  getUserAnalytics,
  getHabitAnalytics,
  getTrendAnalytics,
  getCompletionHeatmap
} from './analytics.api';
export type {
  HabitAnalytics,
  UserAnalytics,
  AnalyticsTrend,
  HeatmapData,
  WeeklyProgress,
  ChartDataset,
  AnalyticsChartData
} from '../types/analytics.types';
export {
  AnalyticsTimeframe,
  TimeGranularity
} from '../types/analytics.types';
export type {
  CompletionStatus,
  TrendDirection
} from '../types/analytics.types';

// Common API types
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  HttpMethod,
  SortOrder
} from '../types/api.types';
export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  isPaginatedResponse,
  isApiError
} from '../types/api.types';