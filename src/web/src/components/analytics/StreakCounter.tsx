import React, { useMemo, useCallback } from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.0
import { Intl } from '@formatjs/intl'; // v2.3.0
import Card from '../common/Card';
import { useAnalytics } from '../../hooks/useAnalytics';
import ErrorBoundary from '../common/ErrorBoundary';
import { ThemeMode } from '../../types/theme.types';

/**
 * Props interface for StreakCounter component
 */
interface StreakCounterProps {
  /** ID of the habit to display streak for */
  habitId: string;
  /** Optional custom CSS classes */
  className?: string;
  /** Whether to show longest streak section */
  showLongestStreak?: boolean;
  /** Callback when streak changes */
  onStreakChange?: (streak: number) => void;
  /** Theme mode override */
  theme?: ThemeMode;
}

/**
 * Formats streak number with appropriate suffix and internationalization
 * @param streak - Number to format
 * @param locale - Optional locale string
 * @returns Formatted streak number with suffix
 */
const formatStreakNumber = (streak: number, locale = 'en-US'): string => {
  if (streak === undefined || streak === null) return '';

  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formattedNumber = formatter.format(streak);
  const suffix = 'days'; // Could be internationalized based on locale

  return `${formattedNumber} ${suffix}`;
};

/**
 * A component that displays current and longest streaks for a habit with
 * enhanced accessibility and loading states.
 */
const StreakCounter: React.FC<StreakCounterProps> = ({
  habitId,
  className,
  showLongestStreak = true,
  onStreakChange,
  theme = ThemeMode.LIGHT
}) => {
  // Get analytics data with loading and error states
  const { habitAnalytics, loading, error } = useAnalytics();

  // Memoize streak values to prevent unnecessary re-renders
  const currentStreak = useMemo(() => {
    return habitAnalytics?.[habitId]?.currentStreak || 0;
  }, [habitAnalytics, habitId]);

  const longestStreak = useMemo(() => {
    return habitAnalytics?.[habitId]?.longestStreak || 0;
  }, [habitAnalytics, habitId]);

  // Notify parent component of streak changes
  React.useEffect(() => {
    onStreakChange?.(currentStreak);
  }, [currentStreak, onStreakChange]);

  /**
   * Renders the current streak section with loading and error states
   */
  const renderCurrentStreak = useCallback(() => {
    if (loading) {
      return (
        <div 
          className="streak-counter__skeleton"
          aria-busy="true"
          role="status"
          aria-label="Loading current streak"
        >
          <div className="streak-counter__skeleton-number" />
          <div className="streak-counter__skeleton-label" />
        </div>
      );
    }

    if (error) {
      return (
        <div 
          className="streak-counter__error"
          role="alert"
          aria-live="polite"
        >
          Failed to load streak data
        </div>
      );
    }

    return (
      <div 
        className="streak-counter__current"
        role="status"
        aria-label={`Current streak: ${formatStreakNumber(currentStreak)}`}
      >
        <span className="streak-counter__number">
          {formatStreakNumber(currentStreak)}
        </span>
        <span className="streak-counter__label">
          Current Streak
        </span>
      </div>
    );
  }, [loading, error, currentStreak]);

  /**
   * Renders the longest streak section if enabled
   */
  const renderLongestStreak = useCallback(() => {
    if (!showLongestStreak) return null;

    if (loading) {
      return (
        <div 
          className="streak-counter__skeleton"
          aria-busy="true"
          role="status"
          aria-label="Loading longest streak"
        >
          <div className="streak-counter__skeleton-number" />
          <div className="streak-counter__skeleton-label" />
        </div>
      );
    }

    if (error) return null;

    return (
      <div 
        className="streak-counter__longest"
        role="status"
        aria-label={`Longest streak: ${formatStreakNumber(longestStreak)}`}
      >
        <span className="streak-counter__number">
          {formatStreakNumber(longestStreak)}
        </span>
        <span className="streak-counter__label">
          Longest Streak
        </span>
      </div>
    );
  }, [showLongestStreak, loading, error, longestStreak]);

  const containerClasses = classNames(
    'streak-counter',
    `streak-counter--${theme}`,
    className
  );

  return (
    <ErrorBoundary
      fallbackTitle="Unable to display streak"
      fallbackDescription="There was a problem loading your streak information. Please try again later."
    >
      <Card
        className={containerClasses}
        elevation="low"
        themeMode={theme}
        testId="streak-counter"
        ariaLabel="Habit streak counter"
      >
        {renderCurrentStreak()}
        {renderLongestStreak()}
      </Card>
    </ErrorBoundary>
  );
};

// Set display name for better debugging
StreakCounter.displayName = 'StreakCounter';

export default StreakCounter;
export type { StreakCounterProps };