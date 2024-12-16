/**
 * @fileoverview Comprehensive test suite for useHabits custom hook
 * Tests habit management functionality including CRUD operations,
 * offline capabilities, optimistic updates, and error handling
 * @version 1.0.0
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-utils';
import useHabits from '../../src/hooks/useHabits';
import habitsApi from '../../src/api/habits.api';
import { HABIT_STATUS } from '../../src/constants/habit.constants';
import type { Habit, CreateHabitPayload, UpdateHabitPayload } from '../../src/types/habit.types';

// Mock API client
jest.mock('../../src/api/habits.api');

// Mock navigator.onLine property
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true
});

// Test data
const mockHabit: Habit = {
  id: 'test-habit-1',
  userId: 'test-user-1',
  name: 'Test Habit',
  description: 'Test habit description',
  frequency: {
    type: 'DAILY',
    value: 1,
    days: [1, 2, 3, 4, 5],
    customSchedule: null
  },
  reminderTime: new Date('2023-01-01T09:00:00Z'),
  status: HABIT_STATUS.ACTIVE,
  isActive: true,
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z')
};

const mockCreatePayload: CreateHabitPayload = {
  name: 'New Habit',
  description: 'New habit description',
  frequency: {
    type: 'DAILY',
    value: 1,
    days: [1, 2, 3, 4, 5],
    customSchedule: null
  },
  reminderTime: new Date('2023-01-01T09:00:00Z')
};

describe('useHabits', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (habitsApi.getHabits as jest.Mock).mockResolvedValue({
      success: true,
      data: { items: [mockHabit] }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial Loading', () => {
    it('should fetch habits on mount', async () => {
      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.habits).toHaveLength(1);
        expect(result.current.habits[0]).toEqual(mockHabit);
      });

      expect(habitsApi.getHabits).toHaveBeenCalledTimes(1);
    });

    it('should handle initial loading error', async () => {
      const error = { message: 'Failed to fetch habits' };
      (habitsApi.getHabits as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeTruthy();
        expect(result.current.habits).toHaveLength(0);
      });
    });
  });

  describe('Habit Creation', () => {
    it('should create habit successfully', async () => {
      (habitsApi.createHabit as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { ...mockHabit, id: 'new-habit-1' }
      });

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.createHabit(mockCreatePayload);
      });

      expect(habitsApi.createHabit).toHaveBeenCalledWith(mockCreatePayload);
      expect(result.current.habits).toContainEqual(
        expect.objectContaining({ id: 'new-habit-1' })
      );
    });

    it('should handle offline habit creation', async () => {
      // Simulate offline state
      Object.defineProperty(window.navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.createHabit(mockCreatePayload);
      });

      expect(result.current.isOffline).toBe(true);
      expect(habitsApi.createHabit).not.toHaveBeenCalled();
      
      // Verify optimistic update
      expect(result.current.habits).toContainEqual(
        expect.objectContaining({
          name: mockCreatePayload.name,
          status: HABIT_STATUS.ACTIVE
        })
      );
    });
  });

  describe('Habit Updates', () => {
    it('should update habit successfully', async () => {
      const updatePayload: UpdateHabitPayload = {
        name: 'Updated Habit',
        description: 'Updated description',
        frequency: mockHabit.frequency,
        reminderTime: mockHabit.reminderTime,
        status: HABIT_STATUS.ACTIVE,
        isActive: true
      };

      (habitsApi.updateHabit as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { ...mockHabit, ...updatePayload }
      });

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.updateHabit(mockHabit.id, updatePayload);
      });

      expect(habitsApi.updateHabit).toHaveBeenCalledWith(
        mockHabit.id,
        updatePayload
      );
      expect(result.current.habits).toContainEqual(
        expect.objectContaining({ name: 'Updated Habit' })
      );
    });

    it('should handle offline habit updates', async () => {
      Object.defineProperty(window.navigator, 'onLine', { value: false });

      const updatePayload: UpdateHabitPayload = {
        name: 'Offline Update',
        description: mockHabit.description,
        frequency: mockHabit.frequency,
        reminderTime: mockHabit.reminderTime,
        status: HABIT_STATUS.ACTIVE,
        isActive: true
      };

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.updateHabit(mockHabit.id, updatePayload);
      });

      expect(result.current.isOffline).toBe(true);
      expect(habitsApi.updateHabit).not.toHaveBeenCalled();
    });
  });

  describe('Habit Completion Logging', () => {
    it('should log habit completion successfully', async () => {
      (habitsApi.logHabitCompletion as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'log-1',
          habitId: mockHabit.id,
          completedAt: new Date(),
          notes: null,
          mood: null
        }
      });

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.logCompletion(mockHabit.id);
      });

      expect(habitsApi.logHabitCompletion).toHaveBeenCalledWith(
        mockHabit.id,
        expect.objectContaining({
          habitId: mockHabit.id,
          completedAt: expect.any(Date)
        })
      );
    });

    it('should handle offline completion logging', async () => {
      Object.defineProperty(window.navigator, 'onLine', { value: false });

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.logCompletion(mockHabit.id);
      });

      expect(result.current.isOffline).toBe(true);
      expect(habitsApi.logHabitCompletion).not.toHaveBeenCalled();
    });
  });

  describe('Offline Synchronization', () => {
    it('should sync offline data when connection is restored', async () => {
      // Setup offline actions
      Object.defineProperty(window.navigator, 'onLine', { value: false });
      
      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      // Perform offline actions
      await act(async () => {
        await result.current.createHabit(mockCreatePayload);
        await result.current.logCompletion(mockHabit.id);
      });

      // Simulate connection restoration
      Object.defineProperty(window.navigator, 'onLine', { value: true });
      
      await act(async () => {
        await result.current.syncOfflineData();
      });

      expect(habitsApi.createHabit).toHaveBeenCalled();
      expect(habitsApi.logHabitCompletion).toHaveBeenCalled();
      expect(habitsApi.getHabits).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      (habitsApi.createHabit as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.createHabit(mockCreatePayload);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle network errors during sync', async () => {
      const error = new Error('Network Error');
      (habitsApi.syncOfflineChanges as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHabits(), {
        wrapper: renderWithProviders
      });

      await act(async () => {
        await result.current.syncOfflineData();
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});