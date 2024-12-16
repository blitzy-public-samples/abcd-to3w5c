/**
 * @fileoverview High-performance data access layer for habit entities with caching,
 * optimized queries, and comprehensive error handling using Prisma ORM with PostgreSQL.
 * Implements efficient data access patterns with Redis caching.
 * 
 * @version 1.0.0
 */

import { prisma } from '../config/database.config';
import { Habit, CreateHabitDTO, UpdateHabitDTO, isValidHabitFrequency } from '../interfaces/habit.interface';
import { Logger } from 'winston'; // v3.8.0
import Redis from 'ioredis'; // v5.0.0
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime';

/**
 * Cache key patterns for habit data
 */
const CACHE_KEYS = {
  HABIT_BY_ID: (id: string) => `habit:${id}`,
  USER_ACTIVE_HABITS: (userId: string) => `user:${userId}:active_habits`,
  USER_HABITS_TTL: 300, // 5 minutes TTL for habit lists
  SINGLE_HABIT_TTL: 600, // 10 minutes TTL for single habits
};

/**
 * Repository class implementing optimized data access patterns for habit entities
 * with caching and comprehensive error handling.
 */
export class HabitRepository {
  constructor(
    private readonly _prisma: typeof prisma,
    private readonly _cache: Redis,
    private readonly _logger: Logger
  ) {
    this._setupErrorHandlers();
  }

  /**
   * Sets up error handlers for database and cache operations
   * @private
   */
  private _setupErrorHandlers(): void {
    this._cache.on('error', (error) => {
      this._logger.error('Redis cache error:', error);
    });

    this._prisma.$on('query', (event: any) => {
      if (event.duration > 100) { // Log slow queries (>100ms)
        this._logger.warn('Slow query detected:', {
          query: event.query,
          duration: event.duration,
          params: event.params
        });
      }
    });
  }

  /**
   * Creates a new habit with validation and error handling
   * @param data - Habit creation data transfer object
   * @param userId - ID of the user creating the habit
   * @returns Promise resolving to the created habit
   * @throws Error if validation fails or database operation fails
   */
  async create(data: CreateHabitDTO, userId: string): Promise<Habit> {
    // Validate frequency configuration
    if (!isValidHabitFrequency(data.frequency)) {
      throw new Error('Invalid habit frequency configuration');
    }

    try {
      // Start transaction for atomic operation
      const habit = await this._prisma.$transaction(async (tx) => {
        const created = await tx.habit.create({
          data: {
            userId,
            name: data.name,
            description: data.description,
            frequency: data.frequency,
            reminderTime: data.reminderTime,
            isActive: true
          }
        });

        // Invalidate user's active habits cache
        await this._cache.del(CACHE_KEYS.USER_ACTIVE_HABITS(userId));

        return created;
      });

      this._logger.info('Habit created successfully', { habitId: habit.id, userId });
      return habit;

    } catch (error) {
      this._logger.error('Failed to create habit:', error);
      if (error instanceof PrismaClientValidationError) {
        throw new Error('Invalid habit data provided');
      }
      throw new Error('Failed to create habit');
    }
  }

  /**
   * Retrieves a habit by ID with caching
   * @param id - Habit ID
   * @returns Promise resolving to the habit or null if not found
   */
  async findById(id: string): Promise<Habit | null> {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.HABIT_BY_ID(id);
      const cached = await this._cache.get(cacheKey);
      
      if (cached) {
        this._logger.debug('Cache hit for habit:', { habitId: id });
        return JSON.parse(cached);
      }

      // Cache miss - query database
      const habit = await this._prisma.habit.findUnique({
        where: { id }
      });

      if (habit) {
        // Cache the result
        await this._cache.setex(
          cacheKey,
          CACHE_KEYS.SINGLE_HABIT_TTL,
          JSON.stringify(habit)
        );
      }

      return habit;

    } catch (error) {
      this._logger.error('Error fetching habit by ID:', error);
      throw new Error('Failed to fetch habit');
    }
  }

  /**
   * Retrieves active habits for a user with caching
   * @param userId - User ID
   * @returns Promise resolving to array of active habits
   */
  async getActiveHabits(userId: string): Promise<Habit[]> {
    try {
      const cacheKey = CACHE_KEYS.USER_ACTIVE_HABITS(userId);
      const cached = await this._cache.get(cacheKey);

      if (cached) {
        this._logger.debug('Cache hit for active habits:', { userId });
        return JSON.parse(cached);
      }

      // Cache miss - execute optimized query
      const habits = await this._prisma.habit.findMany({
        where: {
          userId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Cache results
      await this._cache.setex(
        cacheKey,
        CACHE_KEYS.USER_HABITS_TTL,
        JSON.stringify(habits)
      );

      return habits;

    } catch (error) {
      this._logger.error('Error fetching active habits:', error);
      throw new Error('Failed to fetch active habits');
    }
  }

  /**
   * Updates a habit with cache invalidation
   * @param id - Habit ID
   * @param data - Update data transfer object
   * @returns Promise resolving to updated habit
   */
  async update(id: string, data: UpdateHabitDTO): Promise<Habit> {
    try {
      // Validate frequency if provided
      if (data.frequency && !isValidHabitFrequency(data.frequency)) {
        throw new Error('Invalid habit frequency configuration');
      }

      const habit = await this._prisma.habit.update({
        where: { id },
        data
      });

      // Invalidate caches
      await Promise.all([
        this._cache.del(CACHE_KEYS.HABIT_BY_ID(id)),
        this._cache.del(CACHE_KEYS.USER_ACTIVE_HABITS(habit.userId))
      ]);

      return habit;

    } catch (error) {
      this._logger.error('Error updating habit:', error);
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Habit not found');
      }
      throw new Error('Failed to update habit');
    }
  }

  /**
   * Deletes a habit with cache invalidation
   * @param id - Habit ID
   * @returns Promise resolving to deleted habit
   */
  async delete(id: string): Promise<Habit> {
    try {
      const habit = await this._prisma.habit.delete({
        where: { id }
      });

      // Invalidate caches
      await Promise.all([
        this._cache.del(CACHE_KEYS.HABIT_BY_ID(id)),
        this._cache.del(CACHE_KEYS.USER_ACTIVE_HABITS(habit.userId))
      ]);

      return habit;

    } catch (error) {
      this._logger.error('Error deleting habit:', error);
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Habit not found');
      }
      throw new Error('Failed to delete habit');
    }
  }
}