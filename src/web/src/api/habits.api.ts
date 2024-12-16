/**
 * @fileoverview Comprehensive API client for habit-related operations
 * Implements CRUD operations, tracking, and analytics with caching and error handling
 * @version 1.0.0
 * @license MIT
 */

import { AxiosResponse } from 'axios'; // v1.x
import { apiClient } from '../config/api.config';
import { API_ENDPOINTS, RATE_LIMITS } from '../constants/api.constants';
import {
  Habit,
  CreateHabitPayload,
  UpdateHabitPayload,
  HabitStreak,
  HabitLog,
  HabitStatistics,
} from '../types/habit.types';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '../types/api.types';

// Cache configuration
const CACHE_CONFIG = {
  habitsList: { ttl: 5 * 60 * 1000 }, // 5 minutes
  habitDetails: { ttl: 5 * 60 * 1000 }, // 5 minutes
  statistics: { ttl: 15 * 60 * 1000 }, // 15 minutes
  streaks: { ttl: 5 * 60 * 1000 }, // 5 minutes
} as const;

// In-memory cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Helper function to get cached data if valid
 * @param key - Cache key
 * @param ttl - Time to live in milliseconds
 */
const getCachedData = <T>(key: string, ttl: number): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }
  return null;
};

/**
 * Helper function to set cache data
 * @param key - Cache key
 * @param data - Data to cache
 */
const setCacheData = (key: string, data: any): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

/**
 * Comprehensive habits API client with caching and error handling
 */
export const habitsApi = {
  /**
   * Retrieves paginated list of habits
   * @param params - Pagination parameters
   */
  async getHabits(
    params: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Habit>>> {
    const cacheKey = `habits-list-${JSON.stringify(params)}`;
    const cached = getCachedData<ApiResponse<PaginatedResponse<Habit>>>(
      cacheKey,
      CACHE_CONFIG.habitsList.ttl
    );

    if (cached) {
      return cached;
    }

    const response = await apiClient.get<ApiResponse<PaginatedResponse<Habit>>>(
      API_ENDPOINTS.HABITS.LIST,
      { params }
    );

    if (response.success) {
      setCacheData(cacheKey, response);
    }

    return response;
  },

  /**
   * Retrieves a single habit by ID
   * @param habitId - Unique habit identifier
   */
  async getHabitById(habitId: string): Promise<ApiResponse<Habit>> {
    const cacheKey = `habit-${habitId}`;
    const cached = getCachedData<ApiResponse<Habit>>(
      cacheKey,
      CACHE_CONFIG.habitDetails.ttl
    );

    if (cached) {
      return cached;
    }

    const response = await apiClient.get<ApiResponse<Habit>>(
      `${API_ENDPOINTS.HABITS.BASE}/${habitId}`
    );

    if (response.success) {
      setCacheData(cacheKey, response);
    }

    return response;
  },

  /**
   * Creates a new habit
   * @param payload - Habit creation data
   */
  async createHabit(
    payload: CreateHabitPayload
  ): Promise<ApiResponse<Habit>> {
    const response = await apiClient.post<ApiResponse<Habit>>(
      API_ENDPOINTS.HABITS.CREATE,
      payload
    );

    if (response.success) {
      // Invalidate habits list cache
      cache.delete('habits-list');
    }

    return response;
  },

  /**
   * Updates an existing habit
   * @param habitId - Habit identifier
   * @param payload - Habit update data
   */
  async updateHabit(
    habitId: string,
    payload: UpdateHabitPayload
  ): Promise<ApiResponse<Habit>> {
    const response = await apiClient.put<ApiResponse<Habit>>(
      `${API_ENDPOINTS.HABITS.BASE}/${habitId}`,
      payload
    );

    if (response.success) {
      // Update cache with new data
      setCacheData(`habit-${habitId}`, response);
      // Invalidate related caches
      cache.delete('habits-list');
    }

    return response;
  },

  /**
   * Deletes a habit
   * @param habitId - Habit identifier
   */
  async deleteHabit(habitId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${API_ENDPOINTS.HABITS.BASE}/${habitId}`
    );

    if (response.success) {
      // Invalidate related caches
      cache.delete(`habit-${habitId}`);
      cache.delete('habits-list');
    }

    return response;
  },

  /**
   * Logs completion of a habit
   * @param habitId - Habit identifier
   * @param log - Completion log data
   */
  async logHabitCompletion(
    habitId: string,
    log: Omit<HabitLog, 'id'>
  ): Promise<ApiResponse<HabitLog>> {
    const response = await apiClient.post<ApiResponse<HabitLog>>(
      `${API_ENDPOINTS.HABITS.BASE}/${habitId}/logs`,
      log
    );

    if (response.success) {
      // Invalidate related caches
      cache.delete(`habit-${habitId}`);
      cache.delete(`habit-streak-${habitId}`);
      cache.delete(`habit-statistics-${habitId}`);
    }

    return response;
  },

  /**
   * Retrieves habit statistics
   * @param habitId - Habit identifier
   */
  async getHabitStatistics(
    habitId: string
  ): Promise<ApiResponse<HabitStatistics>> {
    const cacheKey = `habit-statistics-${habitId}`;
    const cached = getCachedData<ApiResponse<HabitStatistics>>(
      cacheKey,
      CACHE_CONFIG.statistics.ttl
    );

    if (cached) {
      return cached;
    }

    const response = await apiClient.get<ApiResponse<HabitStatistics>>(
      `${API_ENDPOINTS.HABITS.BASE}/${habitId}/statistics`
    );

    if (response.success) {
      setCacheData(cacheKey, response);
    }

    return response;
  },

  /**
   * Retrieves habit streak information
   * @param habitId - Habit identifier
   */
  async getHabitStreak(habitId: string): Promise<ApiResponse<HabitStreak>> {
    const cacheKey = `habit-streak-${habitId}`;
    const cached = getCachedData<ApiResponse<HabitStreak>>(
      cacheKey,
      CACHE_CONFIG.streaks.ttl
    );

    if (cached) {
      return cached;
    }

    const response = await apiClient.get<ApiResponse<HabitStreak>>(
      `${API_ENDPOINTS.HABITS.BASE}/${habitId}/streak`
    );

    if (response.success) {
      setCacheData(cacheKey, response);
    }

    return response;
  },
};

export default habitsApi;