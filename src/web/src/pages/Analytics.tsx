import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import AnalyticsCard from '../components/analytics/AnalyticsCard';
import CompletionHeatmap from '../components/analytics/CompletionHeatmap';
import ProgressChart from '../components/analytics/ProgressChart';
import StatisticsGrid from '../components/analytics/StatisticsGrid';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsTimeframe } from '../types/analytics.types';

/**
 * Props interface for Analytics page component
 */
interface AnalyticsPageProps {
  /** Optional custom CSS class */
  className?: string;
  /** Initial timeframe for analytics display */
  initialTimeframe?: AnalyticsTimeframe;
  /** Initial habit ID for filtered view */
  initialHabitId?: string;
  /** Controls skeleton loading state */
  showSkeleton?: boolean;
  /** Error handler callback */
  onError?: (error: Error) => void;
}

/**
 * Analytics page component providing comprehensive habit tracking analytics
 * with enhanced error handling, accessibility, and performance optimizations.
 */
const Analytics: React.FC<AnalyticsPageProps> = memo(({
  className,
  initialTimeframe = AnalyticsTimeframe.LAST_30_DAYS,
  initialHabitId,
  showSkeleton = false,
  onError
}) => {
  // State management
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>(initialTimeframe);
  const [selectedHabitId, setSelectedHabitId] = useState<string | undefined>(initialHabitId);

  // Custom hooks
  const { showBoundary } = useErrorBoundary();
  const {
    habitAnalytics,
    userAnalytics,
    loading,
    error,
    fetchHabitData,
    fetchUserData,
    clearCache
  } = useAnalytics({
    refreshInterval: 300000, // 5 minutes
    maxRetries: 3
  });

  // Memoized container classes
  const containerClasses = useMemo(() => {
    return `analytics-page ${className || ''}`.trim();
  }, [className]);

  // Handle timeframe changes with error handling
  const handleTimeframeChange = useCallback(async (newTimeframe: AnalyticsTimeframe) => {
    try {
      setTimeframe(newTimeframe);
      if (selectedHabitId) {
        await fetchHabitData(selectedHabitId, newTimeframe);
      }
      await fetchUserData(newTimeframe);
    } catch (error) {
      showBoundary(error);
      onError?.(error as Error);
    }
  }, [selectedHabitId, fetchHabitData, fetchUserData, showBoundary, onError]);

  // Handle habit selection with error handling
  const handleHabitSelect = useCallback(async (habitId: string | undefined) => {
    try {
      setSelectedHabitId(habitId);
      if (habitId) {
        await fetchHabitData(habitId, timeframe);
      }
    } catch (error) {
      showBoundary(error);
      onError?.(error as Error);
    }
  }, [timeframe, fetchHabitData, showBoundary, onError]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await Promise.all([
          fetchUserData(timeframe),
          initialHabitId ? fetchHabitData(initialHabitId, timeframe) : Promise.resolve()
        ]);
      } catch (error) {
        showBoundary(error);
        onError?.(error as Error);
      }
    };

    fetchInitialData();
  }, [timeframe, initialHabitId, fetchUserData, fetchHabitData, showBoundary, onError]);

  // Render loading state
  if (showSkeleton || loading.userAnalytics) {
    return (
      <div className={containerClasses} aria-busy="true">
        <div className="analytics-skeleton animate-pulse">
          <StatisticsGrid timeframe={timeframe} showSkeleton />
          <div className="analytics-charts-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallbackTitle="Analytics Error"
      fallbackDescription="We encountered an error while loading your analytics. Please try again."
      onError={onError}
    >
      <main 
        className={containerClasses}
        role="main"
        aria-label="Analytics Dashboard"
      >
        {/* Statistics Overview */}
        <section aria-label="Key Statistics" className="mb-8">
          <StatisticsGrid
            habitId={selectedHabitId}
            timeframe={timeframe}
            onError={onError}
          />
        </section>

        {/* Progress Visualization */}
        <section aria-label="Progress Charts" className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsCard
              title="Completion Progress"
              habitId={selectedHabitId || ''}
              timeframe={timeframe}
              className="h-full"
            >
              <ProgressChart
                habitId={selectedHabitId || ''}
                timeframe={timeframe}
                height={300}
                ariaLabel="Habit completion progress over time"
              />
            </AnalyticsCard>

            <AnalyticsCard
              title="Activity Heatmap"
              habitId={selectedHabitId || ''}
              timeframe={timeframe}
              className="h-full"
            >
              <CompletionHeatmap
                timeframe={timeframe}
                habitId={selectedHabitId}
                onCellClick={(date, value) => {
                  console.log('Heatmap cell clicked:', { date, value });
                }}
              />
            </AnalyticsCard>
          </div>
        </section>

        {/* Analytics Controls */}
        <section 
          aria-label="Analytics Controls"
          className="analytics-controls flex justify-between items-center"
        >
          <div className="timeframe-selector">
            {Object.values(AnalyticsTimeframe).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className={`timeframe-button ${timeframe === tf ? 'active' : ''}`}
                aria-pressed={timeframe === tf}
              >
                {tf.toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => clearCache()}
            className="refresh-button"
            aria-label="Refresh analytics data"
          >
            Refresh Data
          </button>
        </section>
      </main>
    </ErrorBoundary>
  );
});

// Set display name for better debugging
Analytics.displayName = 'Analytics';

export default Analytics;
export type { AnalyticsPageProps };