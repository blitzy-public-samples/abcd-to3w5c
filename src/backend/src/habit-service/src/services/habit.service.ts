/**
 * @fileoverview Implements core business logic for habit management with enhanced caching,
 * security, and performance optimizations. Handles data validation, persistence,
 * business rule enforcement, and efficient data access patterns.
 * 
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // v6.0.1
import Redis from 'ioredis'; // v5.3.2
import { Logger } from 'winston'; // v3.8.2
import { HabitRepository } from '../repositories/habit.repository';
import { Habit, CreateHabitDTO, UpdateHabitDTO, HabitFrequency } from '../interfaces/habit.interface';
import { validateCreateHabit, validateUpdateHabit } from '../validators/habit.validator';
import { UUID } from '../../../shared/interfaces/base.interface';

/**
 * Cache configuration constants
 */
const CACHE_CONFIG = {
  KEY_PREFIX: 'habit-service:',
  TTL: {
    HABIT: 3600, // 1 hour
    USER_HABITS: 300, // 5 minutes
    ANALYTICS: 1800 // 30 minutes
  }
};

/**
 * Business rule constants
 */
const BUSINESS_RULES = {
  MAX_USER_HABITS: 50,
  MAX_HABIT_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500
};

/**
 * Error messages for consistent error handling
 */
const ERROR_MESSAGES = {
  HABIT_LIMIT_EXCEEDED: 'User has reached maximum habit limit',
  INVALID_INPUT: 'Invalid habit data provided',
  UNAUTHORIZED: 'User not authorized to access this habit',
  NOT_FOUND: 'Habit not found',
  CACHE_ERROR: 'Cache operation failed',
  DB_ERROR: 'Database operation failed'
};

/**
 * Service class implementing optimized business logic for habit management
 * with caching and comprehensive security controls
 */
@injectable()
export class HabitService {
  private readonly _cacheKeyPrefix: string = CACHE_CONFIG.KEY_PREFIX;

  constructor(
    private readonly _habitRepository: HabitRepository,
    private readonly _cacheClient: Redis,
    private readonly _logger: Logger
  ) {
    this._setupErrorHandlers();
  }

  /**
   * Sets up error handlers for cache operations
   * @private
   */
  private _setupErrorHandlers(): void {
    this._cacheClient.on('error', (error: Error) => {
      this._logger.error('Redis cache error:', { error: error.message });
    });
  }

  /**
   * Generates cache key for habit data
   * @private
   */
  private _getCacheKey(type: string, id: string): string {
    return `${this._cacheKeyPrefix}${type}:${id}`;
  }

  /**
   * Creates a new habit with comprehensive validation and caching
   * @param userId - ID of the user creating the habit
   * @param data - Habit creation data
   * @returns Promise resolving to created habit
   * @throws Error if validation fails or user has reached habit limit
   */
  async createHabit(userId: UUID, data: CreateHabitDTO): Promise<Habit> {
    this._logger.info('Creating new habit', { userId });

    // Validate input data
    const validationResult = validateCreateHabit(data);
    if (!validationResult.isValid) {
      this._logger.warn('Habit validation failed', { errors: validationResult.errors });
      throw new Error(validationResult.errors.join(', '));
    }

    // Check user habit limit
    const userHabitCount = await this._habitRepository.getUserHabitCount(userId);
    if (userHabitCount >= BUSINESS_RULES.MAX_USER_HABITS) {
      throw new Error(ERROR_MESSAGES.HABIT_LIMIT_EXCEEDED);
    }

    try {
      // Create habit
      const habit = await this._habitRepository.create(data, userId);

      // Invalidate user habits cache
      await this._cacheClient.del(this._getCacheKey('user-habits', userId));

      this._logger.info('Habit created successfully', { habitId: habit.id });
      return habit;

    } catch (error) {
      this._logger.error('Failed to create habit', { error });
      throw new Error(ERROR_MESSAGES.DB_ERROR);
    }
  }

  /**
   * Retrieves a habit by ID with caching
   * @param habitId - Habit ID
   * @param userId - User ID for authorization
   * @returns Promise resolving to habit or null if not found
   */
  async getHabitById(habitId: UUID, userId: UUID): Promise<Habit | null> {
    const cacheKey = this._getCacheKey('habit', habitId);

    try {
      // Check cache
      const cached = await this._cacheClient.get(cacheKey);
      if (cached) {
        const habit = JSON.parse(cached);
        // Verify ownership
        if (habit.userId !== userId) {
          throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
        }
        return habit;
      }

      // Cache miss - fetch from database
      const habit = await this._habitRepository.findById(habitId);
      
      if (!habit) {
        return null;
      }

      // Verify ownership
      if (habit.userId !== userId) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Cache result
      await this._cacheClient.setex(
        cacheKey,
        CACHE_CONFIG.TTL.HABIT,
        JSON.stringify(habit)
      );

      return habit;

    } catch (error) {
      this._logger.error('Error fetching habit', { habitId, error });
      throw error;
    }
  }

  /**
   * Updates a habit with validation and cache invalidation
   * @param habitId - Habit ID
   * @param userId - User ID for authorization
   * @param data - Update data
   * @returns Promise resolving to updated habit
   */
  async updateHabit(habitId: UUID, userId: UUID, data: UpdateHabitDTO): Promise<Habit> {
    // Validate input data
    const validationResult = validateUpdateHabit(data);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join(', '));
    }

    // Verify ownership
    const existingHabit = await this._habitRepository.findById(habitId);
    if (!existingHabit || existingHabit.userId !== userId) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    try {
      // Update habit
      const updatedHabit = await this._habitRepository.update(habitId, data);

      // Invalidate caches
      await Promise.all([
        this._cacheClient.del(this._getCacheKey('habit', habitId)),
        this._cacheClient.del(this._getCacheKey('user-habits', userId))
      ]);

      this._logger.info('Habit updated successfully', { habitId });
      return updatedHabit;

    } catch (error) {
      this._logger.error('Failed to update habit', { habitId, error });
      throw new Error(ERROR_MESSAGES.DB_ERROR);
    }
  }

  /**
   * Retrieves active habits for a user with caching
   * @param userId - User ID
   * @returns Promise resolving to array of active habits
   */
  async getUserActiveHabits(userId: UUID): Promise<Habit[]> {
    const cacheKey = this._getCacheKey('user-habits', userId);

    try {
      // Check cache
      const cached = await this._cacheClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      const habits = await this._habitRepository.getActiveHabits(userId);

      // Cache results
      await this._cacheClient.setex(
        cacheKey,
        CACHE_CONFIG.TTL.USER_HABITS,
        JSON.stringify(habits)
      );

      return habits;

    } catch (error) {
      this._logger.error('Error fetching user habits', { userId, error });
      throw new Error(ERROR_MESSAGES.DB_ERROR);
    }
  }

  /**
   * Deletes a habit with authorization and cache invalidation
   * @param habitId - Habit ID
   * @param userId - User ID for authorization
   * @returns Promise resolving to deleted habit
   */
  async deleteHabit(habitId: UUID, userId: UUID): Promise<Habit> {
    // Verify ownership
    const habit = await this._habitRepository.findById(habitId);
    if (!habit || habit.userId !== userId) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    try {
      // Delete habit
      const deletedHabit = await this._habitRepository.delete(habitId);

      // Invalidate caches
      await Promise.all([
        this._cacheClient.del(this._getCacheKey('habit', habitId)),
        this._cacheClient.del(this._getCacheKey('user-habits', userId))
      ]);

      this._logger.info('Habit deleted successfully', { habitId });
      return deletedHabit;

    } catch (error) {
      this._logger.error('Failed to delete habit', { habitId, error });
      throw new Error(ERROR_MESSAGES.DB_ERROR);
    }
  }
}