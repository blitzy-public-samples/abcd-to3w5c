import React, { useMemo, useCallback, useState } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import { Habit } from '../../types/habit.types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { formatHabitFrequency, calculateHabitProgress } from '../../utils/habit.utils';
import useTheme from '../../hooks/useTheme';
import { ThemeMode } from '../../types/theme.types';

/**
 * Props interface for HabitCard component
 */
interface HabitCardProps {
  habit: Habit;
  completionDates: Date[];
  onComplete: (habitId: string) => Promise<void>;
  onEdit: (habitId: string) => void;
  className?: string;
  testId?: string;
}

/**
 * Determines the color of the progress bar based on completion rate and theme
 */
const getProgressColor = (completionRate: number, themeMode: ThemeMode): string => {
  if (completionRate >= 100) {
    return themeMode === ThemeMode.LIGHT ? 'var(--color-success-main)' : 'var(--color-success-light)';
  }
  if (completionRate >= 75) {
    return themeMode === ThemeMode.LIGHT ? 'var(--color-primary-main)' : 'var(--color-primary-light)';
  }
  if (completionRate >= 50) {
    return themeMode === ThemeMode.LIGHT ? 'var(--color-warning-main)' : 'var(--color-warning-light)';
  }
  return themeMode === ThemeMode.LIGHT ? 'var(--color-error-main)' : 'var(--color-error-light)';
};

/**
 * Custom hook for calculating and memoizing habit progress
 */
const useHabitProgress = (habit: Habit, completionDates: Date[]) => {
  return useMemo(() => {
    const progress = calculateHabitProgress(habit, completionDates);
    return {
      completionRate: progress.completionRate,
      currentStreak: progress.currentStreak,
      partialCompletions: progress.partialCompletions
    };
  }, [habit, completionDates]);
};

/**
 * HabitCard component displays habit information with interactive controls
 * and accessibility features
 */
const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  completionDates,
  onComplete,
  onEdit,
  className,
  testId
}) => {
  const { themeMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate progress metrics
  const progress = useHabitProgress(habit, completionDates);
  const progressColor = useMemo(() => 
    getProgressColor(progress.completionRate, themeMode),
    [progress.completionRate, themeMode]
  );

  // Event handlers
  const handleComplete = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      await onComplete(habit.id);
    } catch (err) {
      setError('Failed to update habit completion');
      console.error('Error completing habit:', err);
    } finally {
      setIsLoading(false);
    }
  }, [habit.id, isLoading, onComplete]);

  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit(habit.id);
  }, [habit.id, onEdit]);

  return (
    <Card
      className={classNames('habit-card', className, {
        'habit-card--active': habit.isActive,
        'habit-card--loading': isLoading
      })}
      elevation="medium"
      interactive
      testId={testId}
      ariaLabel={`${habit.name} habit card`}
      role="article"
    >
      <div className="habit-card__header">
        <h3 className="habit-card__title">{habit.name}</h3>
        <button
          className="habit-card__edit-button"
          onClick={handleEdit}
          aria-label={`Edit ${habit.name} habit`}
          disabled={isLoading}
        >
          <Icon name="edit" size="small" />
        </button>
      </div>

      <p className="habit-card__description">{habit.description}</p>

      <div className="habit-card__frequency">
        <Icon name="calendar" size="small" />
        <span>{formatHabitFrequency(habit.frequency)}</span>
      </div>

      <div className="habit-card__progress" role="progressbar" aria-valuenow={progress.completionRate} aria-valuemin={0} aria-valuemax={100}>
        <div 
          className="habit-card__progress-bar"
          style={{ 
            width: `${progress.completionRate}%`,
            backgroundColor: progressColor,
            transition: 'width 0.3s ease-in-out, background-color 0.3s ease-in-out'
          }}
        />
        <span className="habit-card__progress-label">
          {`${Math.round(progress.completionRate)}% Complete`}
        </span>
      </div>

      <div className="habit-card__stats">
        <div className="habit-card__streak">
          <Icon name="fire" size="small" />
          <span>{`${progress.currentStreak} day streak`}</span>
        </div>
        {progress.partialCompletions > 0 && (
          <div className="habit-card__partial">
            <Icon name="partial" size="small" />
            <span>{`${progress.partialCompletions} partial completions`}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="habit-card__error" role="alert">
          {error}
        </div>
      )}

      <button
        className="habit-card__complete-button"
        onClick={handleComplete}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={`Mark ${habit.name} as complete`}
      >
        {isLoading ? (
          <Icon name="loading" size="small" className="habit-card__loading-icon" />
        ) : (
          <Icon name="check" size="small" />
        )}
        <span>Complete</span>
      </button>
    </Card>
  );
};

// Set display name for better debugging
HabitCard.displayName = 'HabitCard';

export default HabitCard;
export type { HabitCardProps };