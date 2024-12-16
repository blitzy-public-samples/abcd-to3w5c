/**
 * @fileoverview Comprehensive unit test suite for HabitService class testing business logic,
 * caching behavior, error handling, and performance requirements.
 * 
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'; // v29.0.0
import Redis from 'ioredis-mock'; // v8.9.0
import { HabitService } from '../../src/services/habit.service';
import { HabitRepository } from '../../src/repositories/habit.repository';
import { CreateHabitDTO, UpdateHabitDTO, FrequencyType, Habit } from '../../src/interfaces/habit.interface';
import { Logger } from 'winston';

// Constants for testing
const PERFORMANCE_THRESHOLD_MS = 100;
const CACHE_TTL = 300;
const TEST_USER_ID = 'test-user-123';
const TEST_HABIT_ID = 'test-habit-456';

// Mock data factory
const createTestHabit = (override = {}): Habit => ({
  id: TEST_HABIT_ID,
  userId: TEST_USER_ID,
  name: 'Test Habit',
  description: 'Test Description',
  frequency: {
    type: FrequencyType.DAILY,
    value: 1,
    days: [1, 3, 5],
    customSchedule: null
  },
  reminderTime: new Date(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override
});

describe('HabitService', () => {
  let habitService: HabitService;
  let habitRepository: jest.Mocked<HabitRepository>;
  let redisClient: Redis;
  let logger: jest.Mocked<Logger>;
  let performanceTimer: number;

  beforeEach(() => {
    // Setup mocks
    habitRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      getActiveHabits: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getUserHabitCount: jest.fn()
    } as any;

    redisClient = new Redis();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;

    habitService = new HabitService(habitRepository, redisClient, logger);
    performanceTimer = Date.now();
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisClient.flushall();
  });

  describe('createHabit', () => {
    test('should create habit successfully within performance threshold', async () => {
      // Arrange
      const createDTO: CreateHabitDTO = {
        name: 'Morning Meditation',
        description: 'Daily morning meditation practice',
        frequency: {
          type: FrequencyType.DAILY,
          value: 1,
          days: [1, 2, 3, 4, 5],
          customSchedule: null
        },
        reminderTime: new Date()
      };

      const expectedHabit = createTestHabit(createDTO);
      habitRepository.getUserHabitCount.mockResolvedValue(0);
      habitRepository.create.mockResolvedValue(expectedHabit);

      // Act
      const startTime = Date.now();
      const result = await habitService.createHabit(TEST_USER_ID, createDTO);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toEqual(expectedHabit);
      expect(habitRepository.create).toHaveBeenCalledWith(createDTO, TEST_USER_ID);
      expect(logger.info).toHaveBeenCalled();
    });

    test('should throw error when habit limit exceeded', async () => {
      // Arrange
      const createDTO: CreateHabitDTO = {
        name: 'Test Habit',
        description: 'Test Description',
        frequency: {
          type: FrequencyType.DAILY,
          value: 1,
          days: [1],
          customSchedule: null
        },
        reminderTime: null
      };

      habitRepository.getUserHabitCount.mockResolvedValue(50);

      // Act & Assert
      await expect(habitService.createHabit(TEST_USER_ID, createDTO))
        .rejects
        .toThrow('User has reached maximum habit limit');
    });

    test('should validate habit data before creation', async () => {
      // Arrange
      const invalidDTO: CreateHabitDTO = {
        name: '', // Invalid - empty name
        description: 'Test',
        frequency: {
          type: FrequencyType.DAILY,
          value: 1,
          days: [],
          customSchedule: null
        },
        reminderTime: null
      };

      // Act & Assert
      await expect(habitService.createHabit(TEST_USER_ID, invalidDTO))
        .rejects
        .toThrow();
    });
  });

  describe('getHabitById', () => {
    test('should return cached habit if available', async () => {
      // Arrange
      const cachedHabit = createTestHabit();
      await redisClient.setex(
        `habit-service:habit:${TEST_HABIT_ID}`,
        CACHE_TTL,
        JSON.stringify(cachedHabit)
      );

      // Act
      const startTime = Date.now();
      const result = await habitService.getHabitById(TEST_HABIT_ID, TEST_USER_ID);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toEqual(cachedHabit);
      expect(habitRepository.findById).not.toHaveBeenCalled();
    });

    test('should fetch from repository on cache miss', async () => {
      // Arrange
      const habit = createTestHabit();
      habitRepository.findById.mockResolvedValue(habit);

      // Act
      const result = await habitService.getHabitById(TEST_HABIT_ID, TEST_USER_ID);

      // Assert
      expect(result).toEqual(habit);
      expect(habitRepository.findById).toHaveBeenCalledWith(TEST_HABIT_ID);
    });

    test('should throw error for unauthorized access', async () => {
      // Arrange
      const habit = createTestHabit({ userId: 'different-user' });
      habitRepository.findById.mockResolvedValue(habit);

      // Act & Assert
      await expect(habitService.getHabitById(TEST_HABIT_ID, TEST_USER_ID))
        .rejects
        .toThrow('User not authorized to access this habit');
    });
  });

  describe('updateHabit', () => {
    test('should update habit successfully within performance threshold', async () => {
      // Arrange
      const updateDTO: UpdateHabitDTO = {
        name: 'Updated Habit',
        isActive: true
      };

      const existingHabit = createTestHabit();
      const updatedHabit = createTestHabit({ ...updateDTO });

      habitRepository.findById.mockResolvedValue(existingHabit);
      habitRepository.update.mockResolvedValue(updatedHabit);

      // Act
      const startTime = Date.now();
      const result = await habitService.updateHabit(TEST_HABIT_ID, TEST_USER_ID, updateDTO);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toEqual(updatedHabit);
      expect(habitRepository.update).toHaveBeenCalledWith(TEST_HABIT_ID, updateDTO);
    });

    test('should invalidate cache after update', async () => {
      // Arrange
      const updateDTO: UpdateHabitDTO = { name: 'Updated Habit' };
      const existingHabit = createTestHabit();
      const updatedHabit = createTestHabit({ ...updateDTO });

      habitRepository.findById.mockResolvedValue(existingHabit);
      habitRepository.update.mockResolvedValue(updatedHabit);

      // Pre-populate cache
      await redisClient.setex(
        `habit-service:habit:${TEST_HABIT_ID}`,
        CACHE_TTL,
        JSON.stringify(existingHabit)
      );

      // Act
      await habitService.updateHabit(TEST_HABIT_ID, TEST_USER_ID, updateDTO);

      // Assert
      const cachedValue = await redisClient.get(`habit-service:habit:${TEST_HABIT_ID}`);
      expect(cachedValue).toBeNull();
    });
  });

  describe('deleteHabit', () => {
    test('should delete habit and invalidate cache', async () => {
      // Arrange
      const habit = createTestHabit();
      habitRepository.findById.mockResolvedValue(habit);
      habitRepository.delete.mockResolvedValue(habit);

      // Pre-populate cache
      await redisClient.setex(
        `habit-service:habit:${TEST_HABIT_ID}`,
        CACHE_TTL,
        JSON.stringify(habit)
      );

      // Act
      const result = await habitService.deleteHabit(TEST_HABIT_ID, TEST_USER_ID);

      // Assert
      expect(result).toEqual(habit);
      expect(habitRepository.delete).toHaveBeenCalledWith(TEST_HABIT_ID);
      
      const cachedValue = await redisClient.get(`habit-service:habit:${TEST_HABIT_ID}`);
      expect(cachedValue).toBeNull();
    });

    test('should throw error for unauthorized deletion', async () => {
      // Arrange
      const habit = createTestHabit({ userId: 'different-user' });
      habitRepository.findById.mockResolvedValue(habit);

      // Act & Assert
      await expect(habitService.deleteHabit(TEST_HABIT_ID, TEST_USER_ID))
        .rejects
        .toThrow('User not authorized to access this habit');
    });
  });

  describe('getUserActiveHabits', () => {
    test('should return cached active habits if available', async () => {
      // Arrange
      const activeHabits = [createTestHabit(), createTestHabit({ id: 'test-habit-789' })];
      await redisClient.setex(
        `habit-service:user-habits:${TEST_USER_ID}`,
        CACHE_TTL,
        JSON.stringify(activeHabits)
      );

      // Act
      const startTime = Date.now();
      const result = await habitService.getUserActiveHabits(TEST_USER_ID);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(result).toEqual(activeHabits);
      expect(habitRepository.getActiveHabits).not.toHaveBeenCalled();
    });

    test('should fetch from repository and cache on cache miss', async () => {
      // Arrange
      const activeHabits = [createTestHabit(), createTestHabit({ id: 'test-habit-789' })];
      habitRepository.getActiveHabits.mockResolvedValue(activeHabits);

      // Act
      const result = await habitService.getUserActiveHabits(TEST_USER_ID);

      // Assert
      expect(result).toEqual(activeHabits);
      expect(habitRepository.getActiveHabits).toHaveBeenCalledWith(TEST_USER_ID);

      const cachedValue = await redisClient.get(`habit-service:user-habits:${TEST_USER_ID}`);
      expect(JSON.parse(cachedValue!)).toEqual(activeHabits);
    });
  });
});