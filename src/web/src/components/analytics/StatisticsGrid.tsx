import React, { useMemo, useCallback } from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import { Card } from '../common/Card';
import { useAnalytics } from '../../hooks/useAnalytics';
import { AnalyticsTimeframe } from '../../types/analytics.types';
import { HEATMAP_CONFIG } from '../../constants/analytics.constants';

/**
 * Props interface for StatisticsGrid component
 */
interface StatisticsGridProps {
  /** Optional custom CSS classes */
  className?: string;
  /** ID of the habit to show statistics for */
  habitId?: string;
  /** Time period for analytics calculation */
  timeframe: AnalyticsTimeframe;
  /** Controls whether to show refresh button */
  showRefreshButton?: boolean;
  /** Optional error callback */
  onError?: (error: Error) => void;
}

/**
 * Formats a decimal number as a percentage string
 * @param value - Number to format
 * @param decimals - Number of decimal places
 */
const formatPercentage = (value: number, decimals: number = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * A responsive grid component that displays key analytics statistics
 */
const StatisticsGrid: React.FC<StatisticsGridProps> = ({
  className,
  habitId,
  timeframe,
  showRefreshButton = true,
  onError
}) => {
  // Fetch analytics data using the analytics hook
  const {
    habitAnalytics,
    userAnalytics,
    loading,
    error,
    fetchHabitData,
    fetchUserData
  } = useAnalytics();

  // Handle error scenarios
  const handleError = useCallback((error: Error) => {
    console.error('Statistics Grid Error:', error);
    onError?.(error);
  }, [onError]);

  // Memoized grid classes
  const gridClasses = useMemo(() => classNames(
    'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
    className
  ), [className]);

  // Memoized loading skeleton classes
  const skeletonClasses = useMemo(() => classNames(
    'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-32'
  ), []);

  /**
   * Renders a single statistic card with proper accessibility
   */
  const renderStatCard = useCallback((
    title: string,
    value: string | number,
    description: string,
    ariaLabel: string
  ) => (
    <Card
      className="p-4"
      elevation="low"
      ariaLabel={ariaLabel}
      role="article"
      focusable
    >
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <p className="mt-2 text-3xl font-semibold">
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </Card>
  ), []);

  /**
   * Renders loading skeleton for progressive enhancement
   */
  const renderLoadingState = useCallback(() => (
    <div className={gridClasses}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`skeleton-${index}`} className={skeletonClasses} />
      ))}
    </div>
  ), [gridClasses, skeletonClasses]);

  // Handle error state
  if (error) {
    handleError(error);
    return (
      <div className="text-center p-4 text-red-600 dark:text-red-400">
        Failed to load statistics. Please try again later.
      </div>
    );
  }

  // Show loading state
  if (loading.habitAnalytics || loading.userAnalytics) {
    return renderLoadingState();
  }

  // Render statistics grid
  return (
    <div className={gridClasses}>
      {/* Overall Completion Rate */}
      {renderStatCard(
        'Completion Rate',
        formatPercentage(habitId 
          ? habitAnalytics?.completionRate || 0
          : userAnalytics?.overallCompletionRate || 0
        ),
        'Average completion rate',
        'Overall habit completion rate statistic'
      )}

      {/* Current Streak */}
      {renderStatCard(
        'Current Streak',
        habitId
          ? habitAnalytics?.currentStreak || 0
          : userAnalytics?.trends?.[0]?.value || 0,
        'Days in a row',
        'Current streak statistic'
      )}

      {/* Total Active Habits */}
      {!habitId && renderStatCard(
        'Active Habits',
        userAnalytics?.activeHabits || 0,
        'Currently tracked habits',
        'Number of active habits statistic'
      )}

      {/* Longest Streak */}
      {habitId && renderStatCard(
        'Longest Streak',
        habitAnalytics?.longestStreak || 0,
        'Best performance',
        'Longest streak statistic'
      )}

      {/* Weekly Progress */}
      {habitId && renderStatCard(
        'Weekly Progress',
        formatPercentage(habitAnalytics?.weeklyProgress?.rate || 0),
        `${habitAnalytics?.weeklyProgress?.completedDays || 0}/${habitAnalytics?.weeklyProgress?.totalDays || 7} days`,
        'Weekly progress statistic'
      )}
    </div>
  );
};

// Set display name for better debugging
StatisticsGrid.displayName = 'StatisticsGrid';

export default StatisticsGrid;
export type { StatisticsGridProps };