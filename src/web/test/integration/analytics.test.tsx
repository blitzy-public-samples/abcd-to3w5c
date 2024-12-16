import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import Analytics from '../../src/pages/Analytics';
import { renderWithProviders } from '../utils/test-utils';
import { getUserAnalytics, getHabitAnalytics, getTrendAnalytics } from '../../src/api/analytics.api';
import { AnalyticsTimeframe } from '../../src/types/analytics.types';

// Mock API functions
vi.mock('../../src/api/analytics.api');

// Mock data
const MOCK_USER_ANALYTICS = {
  userId: 'test-user',
  totalHabits: 5,
  activeHabits: 3,
  overallCompletionRate: 0.75,
  trends: [
    { period: '2023-01', value: 0.8, change: 0.1, trend: 'up' }
  ]
};

const MOCK_HABIT_ANALYTICS = {
  habitId: 'test-habit',
  completionRate: 0.85,
  currentStreak: 7,
  longestStreak: 14,
  weeklyProgress: {
    week: 1,
    completedDays: 5,
    totalDays: 7,
    rate: 0.714
  }
};

describe('Analytics Page Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
    
    // Setup default mock responses
    (getUserAnalytics as jest.Mock).mockResolvedValue({
      success: true,
      data: MOCK_USER_ANALYTICS
    });
    
    (getHabitAnalytics as jest.Mock).mockResolvedValue({
      success: true,
      data: MOCK_HABIT_ANALYTICS
    });
    
    (getTrendAnalytics as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    });
  });

  it('should render analytics page with loading state', async () => {
    const { container } = renderWithProviders(<Analytics />);
    
    // Verify loading state
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading analytics data')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('should display user analytics data correctly', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      // Verify completion rate
      expect(screen.getByText('75%')).toBeInTheDocument();
      
      // Verify active habits
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Verify trends
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  it('should handle timeframe changes', async () => {
    renderWithProviders(<Analytics />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Change timeframe
    const monthlyButton = screen.getByRole('button', { name: /monthly/i });
    await userEvent.click(monthlyButton);

    // Verify API calls
    expect(getUserAnalytics).toHaveBeenCalledWith(AnalyticsTimeframe.MONTHLY);
    expect(getHabitAnalytics).not.toHaveBeenCalled();
  });

  it('should handle habit selection', async () => {
    const habitId = 'test-habit';
    renderWithProviders(
      <Analytics initialHabitId={habitId} />
    );

    await waitFor(() => {
      // Verify habit analytics API call
      expect(getHabitAnalytics).toHaveBeenCalledWith(
        habitId,
        AnalyticsTimeframe.LAST_30_DAYS
      );
      
      // Verify habit-specific data display
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    // Mock API error
    (getUserAnalytics as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch analytics')
    );

    renderWithProviders(<Analytics />);

    await waitFor(() => {
      // Verify error message
      expect(screen.getByText(/failed to fetch analytics/i)).toBeInTheDocument();
      
      // Verify retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('should meet accessibility requirements', async () => {
    const { container } = renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should maintain performance requirements', async () => {
    const startTime = performance.now();
    
    renderWithProviders(<Analytics />);
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Verify render time is under 100ms target
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle data refresh correctly', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh data/i });
    await userEvent.click(refreshButton);

    // Verify API calls are made with force refresh
    expect(getUserAnalytics).toHaveBeenCalledWith(
      AnalyticsTimeframe.LAST_30_DAYS,
      true
    );
  });

  it('should render charts with correct data', async () => {
    renderWithProviders(<Analytics />);

    await waitFor(() => {
      // Verify progress chart
      const progressChart = screen.getByRole('img', { 
        name: /habit completion progress chart/i 
      });
      expect(progressChart).toBeInTheDocument();

      // Verify heatmap
      const heatmap = screen.getByRole('grid', { 
        name: /habit completion heatmap/i 
      });
      expect(heatmap).toBeInTheDocument();
    });
  });

  it('should handle responsive layout correctly', async () => {
    const { container } = renderWithProviders(<Analytics />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Verify grid layout classes
    const statisticsGrid = container.querySelector('.grid-cols-1');
    expect(statisticsGrid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-4');
  });
});