import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { axe } from 'jest-axe';
import { renderWithProviders } from '../utils/test-utils';
import AnalyticsCard from '../../src/components/analytics/AnalyticsCard';
import CompletionHeatmap from '../../src/components/analytics/CompletionHeatmap';
import { AnalyticsTimeframe } from '../../types/analytics.types';
import { HEATMAP_CONFIG } from '../../constants/analytics.constants';

// Test constants
const TEST_HABIT_ID = 'test-habit-123';
const MOCK_TIMEFRAME = AnalyticsTimeframe.MONTHLY;
const PERFORMANCE_THRESHOLD_MS = 100;
const VIEWPORT_SIZES = {
  MOBILE: { width: 320, height: 568 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1024, height: 768 }
};

// Mock data generator
const generateMockAnalyticsData = (config = {}) => ({
  habitId: TEST_HABIT_ID,
  completionRate: 0.75,
  currentStreak: 7,
  longestStreak: 14,
  weeklyProgress: {
    completedDays: 5,
    totalDays: 7,
    rate: 0.714
  },
  ...config
});

// Mock API responses
jest.mock('../../src/hooks/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    habitAnalytics: {},
    loading: false,
    error: null,
    fetchHabitData: jest.fn(),
    fetchHeatmap: jest.fn()
  }))
}));

describe('AnalyticsCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    const { container } = renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
        loading={true}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelector('.analytics-card__skeleton')).toBeInTheDocument();
  });

  it('displays analytics data with proper formatting', async () => {
    const mockData = generateMockAnalyticsData();
    
    renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
        data={mockData}
      />
    );

    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('5/7 days completed')).toBeInTheDocument();
  });

  it('handles empty data states gracefully', () => {
    renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
      />
    );

    expect(screen.getByText('No analytics data available')).toBeInTheDocument();
  });

  it('meets accessibility standards', async () => {
    const { container } = renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
        data={generateMockAnalyticsData()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('performs within performance threshold', async () => {
    const startTime = performance.now();
    
    renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
        data={generateMockAnalyticsData()}
      />
    );

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
  });
});

describe('CompletionHeatmap Component', () => {
  const mockHeatmapData = Array.from({ length: 28 }, (_, index) => ({
    date: new Date(2024, 0, index + 1).toISOString(),
    value: Math.random(),
    status: 'completed'
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders heatmap grid with correct dimensions', () => {
    renderWithProviders(
      <CompletionHeatmap
        timeframe={MOCK_TIMEFRAME}
        habitId={TEST_HABIT_ID}
      />
    );

    const grid = screen.getByRole('grid');
    const cells = within(grid).getAllByRole('gridcell');
    expect(cells).toHaveLength(28);
  });

  it('displays accurate color intensities for completion rates', () => {
    renderWithProviders(
      <CompletionHeatmap
        timeframe={MOCK_TIMEFRAME}
        habitId={TEST_HABIT_ID}
      />
    );

    const cells = screen.getAllByRole('gridcell');
    cells.forEach(cell => {
      const style = window.getComputedStyle(cell);
      expect(style.backgroundColor).toMatch(/rgba?\(.*\)/);
    });
  });

  it('handles keyboard navigation properly', () => {
    renderWithProviders(
      <CompletionHeatmap
        timeframe={MOCK_TIMEFRAME}
        habitId={TEST_HABIT_ID}
      />
    );

    const cells = screen.getAllByRole('gridcell');
    const firstCell = cells[0];
    
    firstCell.focus();
    expect(document.activeElement).toBe(firstCell);

    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[1]);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[8]);
  });

  it('adapts to different viewport sizes', () => {
    Object.values(VIEWPORT_SIZES).forEach(size => {
      window.innerWidth = size.width;
      window.innerHeight = size.height;
      window.dispatchEvent(new Event('resize'));

      const { container } = renderWithProviders(
        <CompletionHeatmap
          timeframe={MOCK_TIMEFRAME}
          habitId={TEST_HABIT_ID}
        />
      );

      const grid = container.querySelector('.heatmap-grid');
      expect(grid).toBeInTheDocument();
    });
  });
});

describe('Analytics Integration', () => {
  it('integrates properly with Redux store', async () => {
    const { store } = renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
      />
    );

    expect(store.getState().analytics).toBeDefined();
  });

  it('handles API interactions correctly', async () => {
    const mockFetchHabitData = jest.fn();
    jest.spyOn(require('../../src/hooks/useAnalytics'), 'useAnalytics')
      .mockImplementation(() => ({
        habitAnalytics: {},
        loading: false,
        error: null,
        fetchHabitData: mockFetchHabitData
      }));

    renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
      />
    );

    await waitFor(() => {
      expect(mockFetchHabitData).toHaveBeenCalledWith(
        TEST_HABIT_ID,
        MOCK_TIMEFRAME,
        false
      );
    });
  });

  it('handles network errors gracefully', async () => {
    jest.spyOn(require('../../src/hooks/useAnalytics'), 'useAnalytics')
      .mockImplementation(() => ({
        habitAnalytics: {},
        loading: false,
        error: new Error('Network error'),
        fetchHabitData: jest.fn()
      }));

    renderWithProviders(
      <AnalyticsCard
        title="Test Analytics"
        habitId={TEST_HABIT_ID}
        timeframe={MOCK_TIMEFRAME}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });
});