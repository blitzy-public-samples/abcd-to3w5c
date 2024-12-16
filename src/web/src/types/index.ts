/**
 * @fileoverview Central type definition file for the Habit Tracking Application
 * Aggregates and re-exports all TypeScript types, interfaces, and enums
 * @version 1.0.0
 */

// Analytics Types
export {
  AnalyticsTimeframe,
  TimeGranularity,
  type CompletionStatus,
  type TrendDirection,
  type ChartDataset,
  type WeeklyProgress,
  type HeatmapData,
  type AnalyticsTrend,
  type AnalyticsChartData,
  type HabitAnalytics,
  type UserAnalytics
} from './analytics.types';

// Authentication Types
export {
  AuthProvider,
  TokenType,
  type AuthError,
  type AuthScope,
  type User,
  type LoginCredentials,
  type RegisterCredentials,
  type AuthState,
  type AuthToken,
  type AuthResponse,
  type Auth0UserMapping,
  type TokenValidation,
  type AuthConfig,
  hasPermission,
  hasRole
} from './auth.types';

// Habit Management Types
export {
  FrequencyType,
  HabitStatus,
  type HabitFrequency,
  type Habit,
  type HabitLog,
  type HabitStreak,
  type HabitStatistics,
  type CreateHabitPayload,
  type UpdateHabitPayload,
  isCustomFrequency,
  isActiveHabit
} from './habit.types';

// Theme System Types
export {
  ThemeMode,
  type ThemeColors,
  type ThemeTypography,
  type ThemeState,
  isThemeMode,
  DEFAULT_TYPOGRAPHY_SCALE,
  FONT_WEIGHTS,
  LINE_HEIGHTS
} from './theme.types';

/**
 * Type utility for Redux state management
 * Ensures type safety in Redux actions and reducers
 */
export type RootState = {
  auth: AuthState;
  theme: ThemeState;
  habits: {
    items: Habit[];
    loading: boolean;
    error: string | null;
  };
  analytics: {
    userAnalytics: UserAnalytics | null;
    habitAnalytics: Record<string, HabitAnalytics>;
    loading: boolean;
    error: string | null;
  };
};

/**
 * Type utility for API response handling
 * Provides consistent error handling across the application
 */
export type ApiResponse<T> = {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  } | null;
  loading: boolean;
};

/**
 * Type utility for component props that require authentication
 * Ensures components receive necessary authentication context
 */
export type WithAuthProps = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
};

/**
 * Type utility for theme-aware components
 * Ensures components receive necessary theme context
 */
export type WithThemeProps = {
  theme: ThemeMode;
  toggleTheme: (mode: ThemeMode) => void;
};

/**
 * Type utility for pagination parameters
 * Ensures consistent pagination implementation across the application
 */
export type PaginationParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Type utility for filtering parameters
 * Ensures consistent filtering implementation across the application
 */
export type FilterParams = {
  status?: HabitStatus[];
  frequency?: FrequencyType[];
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
};