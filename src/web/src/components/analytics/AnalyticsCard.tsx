import React, { useMemo, useCallback } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import Card from '../common/Card';
import { HabitAnalytics, AnalyticsTimeframe } from '../../types/analytics.types';
import { useAnalytics } from '../../hooks/useAnalytics';
import ErrorBoundary from '../common/ErrorBoundary';
import { HEATMAP_CONFIG } from '../../constants/analytics.constants';
import Icon from '../common/Icon';

/**
 * Props interface for AnalyticsCard component
 */
interface AnalyticsCardProps {
  /** Title of the analytics card */
  title: string;
  /** ID of the habit to display analytics for */
  habitId: string;
  /** Time period for analytics calculation */
  timeframe: AnalyticsTimeframe;
  /** Optional custom CSS classes */
  className?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Analytics data */
  data?: HabitAnalytics;
  /** Error handler callback */
  onError?: (error: Error) => void;
  /** Accessibility enabled flag */
  isAccessible?: boolean;
}

/**
 * Formats analytics values with proper units and localization
 */
const formatAnalyticsValue = (value: number, type: 'percentage' | 'count' | 'streak'): string => {
  switch (type) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'streak':
      return value === 1 ? '1 day' : `${value} days`;
    default:
      return value.toString();
  }
};

/**
 * A reusable analytics card component that displays habit tracking metrics
 * with enhanced accessibility and responsive design.
 */
const AnalyticsCard: React.FC<AnalyticsCardProps> = React.memo(({
  title,
  habitId,
  timeframe,
  className,
  loading = false,
  data,
  onError,
  isAccessible = true
}) => {
  // Custom hook for analytics data management
  const {
    habitAnalytics,
    loading: analyticsLoading,
    error,
    fetchHabitData
  } = useAnalytics({
    refreshInterval: 300000, // 5 minutes
    maxRetries: 3
  });

  // Fetch data on mount and timeframe change
  React.useEffect(() => {
    fetchHabitData(habitId, timeframe, false).catch((err) => {
      onError?.(err);
    });
  }, [habitId, timeframe, fetchHabitData, onError]);

  // Memoized analytics data
  const analyticsData = useMemo(() => {
    return data || habitAnalytics[habitId];
  }, [data, habitAnalytics, habitId]);

  // Memoized loading state
  const isLoading = useMemo(() => {
    return loading || analyticsLoading;
  }, [loading, analyticsLoading]);

  // Memoized CSS classes
  const cardClasses = useMemo(() => {
    return classNames(
      'analytics-card',
      {
        'analytics-card--loading': isLoading,
        'analytics-card--error': error,
        'analytics-card--accessible': isAccessible
      },
      className
    );
  }, [isLoading, error, isAccessible, className]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    fetchHabitData(habitId, timeframe, true).catch((err) => {
      onError?.(err);
    });
  }, [habitId, timeframe, fetchHabitData, onError]);

  // Render card content based on state
  const renderContent = () => {
    if (error) {
      return (
        <div className="analytics-card__error" role="alert">
          <Icon name="error" size="large" ariaLabel="Error" />
          <p className="analytics-card__error-message">
            {error.message}
          </p>
          <button
            onClick={handleRetry}
            className="analytics-card__retry-button"
            aria-label="Retry loading analytics"
          >
            Retry
          </button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="analytics-card__loading" role="status">
          <div className="analytics-card__skeleton" aria-hidden="true" />
          <span className="analytics-card__loading-text">
            Loading analytics...
          </span>
        </div>
      );
    }

    if (!analyticsData) {
      return (
        <div className="analytics-card__empty" role="status">
          <p>No analytics data available</p>
        </div>
      );
    }

    return (
      <div className="analytics-card__content">
        <div className="analytics-card__metrics">
          <div className="analytics-card__metric" role="group" aria-label="Completion Rate">
            <span className="analytics-card__metric-label">Completion Rate</span>
            <span className="analytics-card__metric-value">
              {formatAnalyticsValue(analyticsData.completionRate, 'percentage')}
            </span>
          </div>
          
          <div className="analytics-card__metric" role="group" aria-label="Current Streak">
            <span className="analytics-card__metric-label">Current Streak</span>
            <span className="analytics-card__metric-value">
              {formatAnalyticsValue(analyticsData.currentStreak, 'streak')}
            </span>
          </div>

          <div className="analytics-card__metric" role="group" aria-label="Longest Streak">
            <span className="analytics-card__metric-label">Longest Streak</span>
            <span className="analytics-card__metric-value">
              {formatAnalyticsValue(analyticsData.longestStreak, 'streak')}
            </span>
          </div>
        </div>

        <div 
          className="analytics-card__progress"
          role="region"
          aria-label="Weekly Progress"
        >
          <div
            className="analytics-card__progress-bar"
            style={{
              width: `${analyticsData.weeklyProgress.rate * 100}%`,
              backgroundColor: HEATMAP_CONFIG.COLORS.COMPLETED
            }}
            role="progressbar"
            aria-valuenow={analyticsData.weeklyProgress.rate * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <span className="analytics-card__progress-label">
            {`${analyticsData.weeklyProgress.completedDays}/${analyticsData.weeklyProgress.totalDays} days completed`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary
      fallbackTitle="Analytics Error"
      fallbackDescription="We couldn't load the analytics data. Please try again."
      onError={onError}
    >
      <Card
        className={cardClasses}
        elevation="medium"
        interactive={false}
        ariaLabel={`Analytics for ${title}`}
        testId="analytics-card"
      >
        <h3 className="analytics-card__title">{title}</h3>
        {renderContent()}
      </Card>
    </ErrorBoundary>
  );
});

// Set display name for better debugging
AnalyticsCard.displayName = 'AnalyticsCard';

export default AnalyticsCard;
export type { AnalyticsCardProps };