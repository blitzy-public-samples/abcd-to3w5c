import React, { useState, useMemo, useCallback } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import { VirtualList } from 'react-window'; // v1.x
import HabitCard from './HabitCard';
import useHabits from '../../hooks/useHabits';
import ErrorBoundary from '../common/ErrorBoundary';
import EmptyState from '../common/EmptyState';
import { Habit } from '../../types/habit.types';
import { HABIT_STATUS } from '../../constants/habit.constants';

/**
 * Props interface for HabitList component
 */
interface HabitListProps {
  viewType: 'grid' | 'list';
  sortBy: 'name' | 'createdAt' | 'completionRate' | 'streak';
  filterBy: 'all' | 'active' | 'completed' | 'streak' | 'custom';
  onEditHabit: (habitId: string) => void;
  className?: string;
  ariaLabel?: string;
  virtualizeThreshold?: number;
}

/**
 * Memoized sorting function for habits
 */
const sortHabits = (habits: Habit[], sortBy: string): Habit[] => {
  return useMemo(() => {
    const sortedHabits = [...habits];
    
    switch (sortBy) {
      case 'name':
        return sortedHabits.sort((a, b) => a.name.localeCompare(b.name));
      case 'createdAt':
        return sortedHabits.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'completionRate':
        return sortedHabits.sort((a, b) => {
          const rateA = a.statistics?.completionRate || 0;
          const rateB = b.statistics?.completionRate || 0;
          return rateB - rateA;
        });
      case 'streak':
        return sortedHabits.sort((a, b) => {
          const streakA = a.statistics?.currentStreak || 0;
          const streakB = b.statistics?.currentStreak || 0;
          return streakB - streakA;
        });
      default:
        return sortedHabits;
    }
  }, [habits, sortBy]);
};

/**
 * HabitList component displays a responsive and accessible list of habits
 * with advanced filtering, sorting, and virtualization capabilities.
 */
const HabitList: React.FC<HabitListProps> = ({
  viewType = 'grid',
  sortBy = 'createdAt',
  filterBy = 'all',
  onEditHabit,
  className,
  ariaLabel = 'Habits list',
  virtualizeThreshold = 20
}) => {
  // Get habits data and actions from custom hook
  const {
    habits,
    loading,
    error,
    logCompletion,
    isOffline,
    syncOfflineData
  } = useHabits();

  // Local state for list dimensions
  const [listDimensions, setListDimensions] = useState({
    width: 0,
    height: 0
  });

  // Filter habits based on selected filter
  const filteredHabits = useMemo(() => {
    return habits.filter(habit => {
      switch (filterBy) {
        case 'active':
          return habit.status === HABIT_STATUS.ACTIVE;
        case 'completed':
          return habit.status === HABIT_STATUS.COMPLETED;
        case 'streak':
          return (habit.statistics?.currentStreak || 0) > 0;
        case 'custom':
          return habit.frequency.type === 'CUSTOM';
        default:
          return true;
      }
    });
  }, [habits, filterBy]);

  // Sort filtered habits
  const sortedHabits = sortHabits(filteredHabits, sortBy);

  // Handle habit completion with offline support
  const handleHabitComplete = useCallback(async (habitId: string) => {
    try {
      await logCompletion(habitId);
      
      if (isOffline) {
        // Show offline indicator or notification
        console.info('Habit completion queued for sync');
      }
    } catch (error) {
      console.error('Error completing habit:', error);
    }
  }, [logCompletion, isOffline]);

  // Render function for virtualized list items
  const renderHabit = useCallback(({ index, style }) => {
    const habit = sortedHabits[index];
    return (
      <div style={style} className="habit-list-item">
        <HabitCard
          habit={habit}
          completionDates={[]} // This should come from the habit data
          onComplete={() => handleHabitComplete(habit.id)}
          onEdit={() => onEditHabit(habit.id)}
          className={classNames('habit-card', {
            'habit-card--list': viewType === 'list',
            'habit-card--grid': viewType === 'grid'
          })}
          testId={`habit-card-${habit.id}`}
        />
      </div>
    );
  }, [sortedHabits, viewType, handleHabitComplete, onEditHabit]);

  // Handle error state
  if (error) {
    return (
      <EmptyState
        title="Error loading habits"
        description="We couldn't load your habits. Please try again."
        iconName="error"
        buttonText="Retry"
        onActionClick={syncOfflineData}
      />
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="habit-list-loading" role="status">
        <span className="sr-only">Loading habits...</span>
        {/* Add loading skeleton or spinner here */}
      </div>
    );
  }

  // Handle empty state
  if (sortedHabits.length === 0) {
    return (
      <EmptyState
        title="No habits found"
        description={
          filterBy === 'all'
            ? "You haven't created any habits yet. Start by creating your first habit!"
            : "No habits match the selected filters."
        }
        iconName="habits"
        buttonText={filterBy === 'all' ? "Create Habit" : "Clear Filters"}
        onActionClick={() => {/* Handle action */}}
      />
    );
  }

  // Determine if virtualization should be used
  const shouldVirtualize = sortedHabits.length >= virtualizeThreshold;

  return (
    <ErrorBoundary>
      <div
        className={classNames(
          'habit-list',
          `habit-list--${viewType}`,
          className,
          { 'habit-list--offline': isOffline }
        )}
        role="region"
        aria-label={ariaLabel}
        aria-busy={loading}
      >
        {shouldVirtualize ? (
          <VirtualList
            height={listDimensions.height}
            width={listDimensions.width}
            itemCount={sortedHabits.length}
            itemSize={viewType === 'grid' ? 300 : 100}
            overscanCount={2}
          >
            {renderHabit}
          </VirtualList>
        ) : (
          <div className="habit-list-grid">
            {sortedHabits.map((habit, index) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completionDates={[]} // This should come from the habit data
                onComplete={() => handleHabitComplete(habit.id)}
                onEdit={() => onEditHabit(habit.id)}
                className={classNames('habit-card', {
                  'habit-card--list': viewType === 'list',
                  'habit-card--grid': viewType === 'grid'
                })}
                testId={`habit-card-${habit.id}`}
              />
            ))}
          </div>
        )}
        
        {isOffline && (
          <div
            className="habit-list-offline-indicator"
            role="status"
            aria-live="polite"
          >
            You're offline. Changes will sync when you're back online.
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Set display name for better debugging
HabitList.displayName = 'HabitList';

export default React.memo(HabitList);
export type { HabitListProps };