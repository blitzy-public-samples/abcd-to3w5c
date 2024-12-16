import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMediaQuery, Box, CircularProgress } from '@mui/material'; // v5.x
import { AutoSizer, VirtualList } from 'react-window'; // v1.8.x
import HabitGrid from '../components/habits/HabitGrid';
import HabitList from '../components/habits/HabitList';
import ErrorBoundary from '../components/common/ErrorBoundary';
import useHabits from '../hooks/useHabits';
import useTheme from '../hooks/useTheme';

/**
 * Configuration for list virtualization
 */
const VIRTUALIZATION_CONFIG = {
  GRID_ITEM_HEIGHT: 300,
  LIST_ITEM_HEIGHT: 100,
  OVERSCAN_COUNT: 2,
  VIRTUALIZATION_THRESHOLD: 20,
  MOBILE_BREAKPOINT: 768,
} as const;

/**
 * Interface for view preferences
 */
interface ViewPreferences {
  viewType: 'grid' | 'list';
  sortBy: 'name' | 'createdAt' | 'completionRate' | 'streak';
  filterBy: 'all' | 'active' | 'completed' | 'streak' | 'custom';
}

/**
 * Enhanced HabitListPage component with performance optimizations and accessibility
 */
const HabitListPage: React.FC = () => {
  // Theme and responsive hooks
  const { themeMode } = useTheme();
  const isMobile = useMediaQuery(`(max-width: ${VIRTUALIZATION_CONFIG.MOBILE_BREAKPOINT}px)`);

  // Habits data and actions
  const {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    logCompletion,
    syncStatus,
  } = useHabits();

  // Local state
  const [viewPreferences, setViewPreferences] = useState<ViewPreferences>(() => {
    const stored = localStorage.getItem('habit-view-preferences');
    return stored ? JSON.parse(stored) : {
      viewType: 'grid',
      sortBy: 'createdAt',
      filterBy: 'all',
    };
  });

  // Refs for virtualization
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  /**
   * Update container dimensions on resize
   */
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  /**
   * Persist view preferences
   */
  useEffect(() => {
    localStorage.setItem('habit-view-preferences', JSON.stringify(viewPreferences));
  }, [viewPreferences]);

  /**
   * Handle habit editing
   */
  const handleEditHabit = useCallback((habitId: string) => {
    // Implementation will be handled by navigation/modal logic
    console.log('Edit habit:', habitId);
  }, []);

  /**
   * Update view preferences
   */
  const updateViewPreferences = useCallback((updates: Partial<ViewPreferences>) => {
    setViewPreferences(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        role="status"
        aria-label="Loading habits"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box
        ref={containerRef}
        className={`habit-list-page habit-list-page--${themeMode}`}
        sx={{
          padding: { xs: 2, sm: 3 },
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* View Controls Component would go here */}
        
        <Box
          sx={{
            height: 'calc(100% - 64px)', // Adjust based on controls height
            position: 'relative',
          }}
        >
          {viewPreferences.viewType === 'grid' ? (
            <HabitGrid
              habits={habits}
              onHabitComplete={logCompletion}
              onHabitEdit={handleEditHabit}
              onHabitReorder={(startIndex, endIndex) => {
                // Handle habit reordering
                console.log('Reorder:', startIndex, endIndex);
              }}
              className="habit-grid"
              loading={loading}
              error={error}
              virtualize={habits.length >= VIRTUALIZATION_CONFIG.VIRTUALIZATION_THRESHOLD}
            />
          ) : (
            <HabitList
              viewType="list"
              sortBy={viewPreferences.sortBy}
              filterBy={viewPreferences.filterBy}
              onEditHabit={handleEditHabit}
              className="habit-list"
              ariaLabel="Habits list view"
              virtualizeThreshold={VIRTUALIZATION_CONFIG.VIRTUALIZATION_THRESHOLD}
            />
          )}

          {/* Offline Sync Status Indicator */}
          {syncStatus && syncStatus.pendingChanges > 0 && (
            <Box
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                padding: 2,
                borderRadius: 1,
                backgroundColor: 'background.paper',
                boxShadow: 2,
              }}
              role="status"
              aria-live="polite"
            >
              {syncStatus.syncing ? (
                <span>Syncing changes...</span>
              ) : (
                <span>{syncStatus.pendingChanges} changes pending sync</span>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

// Set display name for better debugging
HabitListPage.displayName = 'HabitListPage';

export default React.memo(HabitListPage);