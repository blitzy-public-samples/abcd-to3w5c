/**
 * @fileoverview A React component that renders an accessible, performant line chart
 * for visualizing habit completion progress over time.
 * @version 1.0.0
 * @license MIT
 */

import React, { memo, useMemo, useEffect, useCallback } from 'react'; // v18.0.0
import { Line } from 'react-chartjs-2'; // v5.0.0
import { Chart as ChartJS } from 'chart.js/auto'; // v4.0.0
import { AnalyticsChartData, AnalyticsTimeframe, HabitAnalytics } from '../../types/analytics.types';
import { progressChartOptions } from '../../config/chart.config';
import { useAnalytics } from '../../hooks/useAnalytics';
import { HEATMAP_CONFIG } from '../../constants/analytics.constants';

/**
 * Props interface for the ProgressChart component
 */
interface ProgressChartProps {
  /** Unique identifier of the habit */
  habitId: string;
  /** Time period for data visualization */
  timeframe: AnalyticsTimeframe;
  /** Optional chart height */
  height?: number;
  /** Optional chart width */
  width?: number;
  /** Optional CSS class name */
  className?: string;
  /** Optional ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * Transforms habit analytics data into Chart.js compatible format
 * @param data - Raw habit analytics data
 * @returns Formatted chart data with styling
 */
const transformChartData = (data: HabitAnalytics | null): AnalyticsChartData => {
  if (!data) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Format dates and calculate completion rates
  const weeklyData = data.weeklyProgress;
  const labels = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  });

  const completionRates = Array.from({ length: 7 }, () => 
    (weeklyData?.completedDays / (weeklyData?.totalDays || 1)) * 100 || 0
  );

  return {
    labels,
    datasets: [
      {
        label: 'Completion Rate',
        data: completionRates,
        backgroundColor: HEATMAP_CONFIG.COLORS.COMPLETED + '40', // 40% opacity
        borderColor: HEATMAP_CONFIG.COLORS.COMPLETED,
        fill: true,
        tension: 0.4,
      }
    ]
  };
};

/**
 * A memoized component that renders a line chart showing habit completion progress
 */
export const ProgressChart: React.FC<ProgressChartProps> = memo(({
  habitId,
  timeframe,
  height = 300,
  width,
  className = '',
  ariaLabel = 'Habit completion progress chart'
}) => {
  // Analytics hook for data fetching and state management
  const {
    habitAnalytics,
    loading,
    error,
    fetchHabitData
  } = useAnalytics();

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchHabitData(habitId, timeframe);

    // Cleanup function
    return () => {
      // Any cleanup needed
    };
  }, [habitId, timeframe, fetchHabitData]);

  // Memoize chart data transformation
  const chartData = useMemo(() => 
    transformChartData(habitAnalytics),
    [habitAnalytics]
  );

  // Enhanced chart options with accessibility
  const enhancedOptions = useMemo(() => ({
    ...progressChartOptions,
    plugins: {
      ...progressChartOptions.plugins,
      accessibility: {
        enabled: true,
        announceOnFocus: true,
        description: ariaLabel
      }
    },
    maintainAspectRatio: Boolean(width),
  }), [ariaLabel, width]);

  // Loading state handler
  if (loading) {
    return (
      <div 
        className={`progress-chart-skeleton ${className}`}
        style={{ height, width: width || '100%' }}
        aria-busy="true"
        aria-label="Loading chart data"
      >
        <div className="loading-indicator" />
      </div>
    );
  }

  // Error state handler
  if (error) {
    return (
      <div 
        className={`progress-chart-error ${className}`}
        style={{ height, width: width || '100%' }}
        role="alert"
      >
        <p>Error loading chart data: {error}</p>
        <button 
          onClick={() => fetchHabitData(habitId, timeframe)}
          aria-label="Retry loading chart data"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`progress-chart-container ${className}`}
      style={{ height, width: width || '100%' }}
    >
      <Line
        data={chartData}
        options={enhancedOptions}
        aria-label={ariaLabel}
        role="img"
        tabIndex={0}
      />
    </div>
  );
});

// Display name for debugging
ProgressChart.displayName = 'ProgressChart';

export default ProgressChart;