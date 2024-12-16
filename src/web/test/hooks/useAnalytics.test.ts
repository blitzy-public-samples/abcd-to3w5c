import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { useAnalytics } from '../../src/hooks/useAnalytics';
import { renderWithProviders } from '../utils/test-utils';
import { AnalyticsTimeframe } from '../../src/types/analytics.types';

// Mock data for testing
const mockHabitAnalytics = {
  habitId: 'test-habit-1',
  completionRate: 0.75,
  currentStreak: 5,
  longestStreak: 10,
  weeklyProgress: {
    week: 1,
    completedDays: 5,
    totalDays: 7,
    rate: 0.714
  }
};

const mockUserAnalytics = {
  userId: 'test-user-1',
  totalHabits: 5,
  activeHabits: 3,
  overallCompletionRate: 0.8,
  trends: [
    {
      period: '2023-W01',
      value: 0.8,
      change: 0.1,
      trend: 'up'
    }
  ]
};

const mockHeatmapData = [
  {
    date: new Date('2023-01-01'),
    value: 1,
    status: 'completed'
  },
  {
    date: new Date('2023-01-02'),
    value: 0,
    status: 'missed'
  }
];

// Mock Redux store
const mockStore = {
  getState: jest.fn(),
  dispatch: jest.fn(),
  subscribe: jest.fn()
};

describe('useAnalytics', () => {
  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.dispatch.mockResolvedValue({
      payload: {
        habitAnalytics: mockHabitAnalytics,
        userAnalytics: mockUserAnalytics,
        heatmapData: mockHeatmapData
      }
    });
  });

  // Cleanup after each test
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    expect(result.current.habitAnalytics).toBeNull();
    expect(result.current.userAnalytics).toBeNull();
    expect(result.current.heatmapData).toEqual([]);
    expect(result.current.loading).toEqual({
      habitAnalytics: false,
      userAnalytics: false,
      heatmapData: false
    });
    expect(result.current.error).toBeNull();
  });

  it('should fetch habit analytics data successfully', async () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      await result.current.fetchHabitData('test-habit-1', AnalyticsTimeframe.DAILY);
    });

    await waitFor(() => {
      expect(result.current.habitAnalytics).toEqual(mockHabitAnalytics);
      expect(result.current.loading.habitAnalytics).toBeFalsy();
      expect(result.current.error).toBeNull();
    });
  });

  it('should fetch user analytics data successfully', async () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      await result.current.fetchUserData(AnalyticsTimeframe.DAILY);
    });

    await waitFor(() => {
      expect(result.current.userAnalytics).toEqual(mockUserAnalytics);
      expect(result.current.loading.userAnalytics).toBeFalsy();
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle errors during data fetching', async () => {
    const mockError = new Error('API Error');
    mockStore.dispatch.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      await result.current.fetchHabitData('test-habit-1', AnalyticsTimeframe.DAILY);
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
      expect(result.current.loading.habitAnalytics).toBeFalsy();
    });
  });

  it('should implement retry logic for failed requests', async () => {
    const mockError = new Error('API Error');
    mockStore.dispatch
      .mockRejectedValueOnce(mockError)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({ payload: { habitAnalytics: mockHabitAnalytics } });

    const { result } = renderHook(() => useAnalytics({ maxRetries: 3 }), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      await result.current.fetchHabitData('test-habit-1', AnalyticsTimeframe.DAILY);
    });

    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledTimes(3);
      expect(result.current.habitAnalytics).toEqual(mockHabitAnalytics);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle refresh interval configuration', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useAnalytics({ refreshInterval: 5000 }), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      await result.current.fetchUserData(AnalyticsTimeframe.DAILY);
    });

    jest.advanceTimersByTime(5000);

    expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
  });

  it('should clear cache and force refresh data', async () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      await result.current.clearCache();
    });

    await waitFor(() => {
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('analytics/fetchUserAnalytics'),
          payload: expect.objectContaining({ forceRefresh: true })
        })
      );
    });
  });

  it('should cleanup resources on unmount', () => {
    const { result, unmount } = renderHook(() => useAnalytics({ refreshInterval: 5000 }), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    unmount();

    expect(result.current.loading).toEqual({
      habitAnalytics: false,
      userAnalytics: false,
      heatmapData: false
    });
  });

  it('should handle granular loading states', async () => {
    const { result } = renderHook(() => useAnalytics(), {
      wrapper: ({ children }) => renderWithProviders(children)
    });

    await act(async () => {
      result.current.fetchHabitData('test-habit-1', AnalyticsTimeframe.DAILY);
      result.current.fetchUserData(AnalyticsTimeframe.DAILY);
    });

    expect(result.current.loading.habitAnalytics).toBeTruthy();
    expect(result.current.loading.userAnalytics).toBeTruthy();

    await waitFor(() => {
      expect(result.current.loading.habitAnalytics).toBeFalsy();
      expect(result.current.loading.userAnalytics).toBeFalsy();
    });
  });
});