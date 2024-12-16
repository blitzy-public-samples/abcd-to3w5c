import React, { useCallback, useEffect, useState } from 'react';
import { Box, Container, Typography, Skeleton } from '@mui/material';
import DashboardLayout from '../layouts/DashboardLayout';
import HabitGrid from '../components/habits/HabitGrid';
import StatisticsGrid from '../components/analytics/StatisticsGrid';
import useHabits from '../hooks/useHabits';
import useAnalytics from '../hooks/useAnalytics';
import { AnalyticsTimeframe } from '../types/analytics.types';
import { notificationActions } from '../store/notification.slice';
import { useDispatch } from 'react-redux';

/**
 * Props interface for Dashboard component
 */
interface DashboardProps {
  refreshInterval?: number;
  initialData?: {
    habits: any[];
    analytics: any;
  };
}

/**
 * Main dashboard component implementing a responsive, accessible, and performant
 * view of the user's habit tracking overview.
 */
const Dashboard: React.FC<DashboardProps> = ({
  refreshInterval = 300000, // 5 minutes default refresh
  initialData
}) => {
  const dispatch = useDispatch();
  
  // State management hooks
  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    logCompletion,
    updateHabit,
    isOffline
  } = useHabits();

  const {
    userAnalytics,
    loading: analyticsLoading,
    error: analyticsError,
    fetchUserData,
    setRefreshInterval
  } = useAnalytics({ refreshInterval });

  // Local state for optimistic updates
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null);

  // Setup analytics refresh interval
  useEffect(() => {
    setRefreshInterval(refreshInterval);
    return () => setRefreshInterval(0); // Cleanup on unmount
  }, [refreshInterval, setRefreshInterval]);

  /**
   * Handles habit completion with optimistic updates and error handling
   */
  const handleHabitComplete = useCallback(async (habitId: string) => {
    try {
      setUpdatingHabitId(habitId);
      await logCompletion(habitId);
      
      // Show success notification
      dispatch(notificationActions.addNotification({
        type: 'success',
        message: 'Habit marked as complete!',
        duration: 3000
      }));

      // Refresh analytics after completion
      await fetchUserData(AnalyticsTimeframe.DAILY, true);
    } catch (error) {
      dispatch(notificationActions.addNotification({
        type: 'error',
        message: 'Failed to mark habit as complete. Please try again.',
        duration: 5000
      }));
      console.error('Error completing habit:', error);
    } finally {
      setUpdatingHabitId(null);
    }
  }, [dispatch, logCompletion, fetchUserData]);

  /**
   * Handles habit editing navigation
   */
  const handleHabitEdit = useCallback((habitId: string) => {
    window.location.href = `/habits/${habitId}/edit`;
  }, []);

  /**
   * Handles habit reordering
   */
  const handleHabitReorder = useCallback(async (startIndex: number, endIndex: number) => {
    try {
      const reorderedHabits = [...habits];
      const [movedHabit] = reorderedHabits.splice(startIndex, 1);
      reorderedHabits.splice(endIndex, 0, movedHabit);

      // Update habit order in backend
      await Promise.all(reorderedHabits.map((habit, index) => 
        updateHabit(habit.id, { ...habit, order: index })
      ));
    } catch (error) {
      dispatch(notificationActions.addNotification({
        type: 'error',
        message: 'Failed to reorder habits. Please try again.',
        duration: 5000
      }));
      console.error('Error reordering habits:', error);
    }
  }, [habits, updateHabit, dispatch]);

  // Render loading skeleton
  if (habitsLoading || analyticsLoading) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl">
          <Box mb={4}>
            <Skeleton variant="text" width="50%" height={40} />
            <Skeleton variant="rectangular" height={200} />
          </Box>
          <Box mb={4}>
            <Skeleton variant="text" width="30%" height={32} />
            <Skeleton variant="rectangular" height={400} />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  // Render error state
  if (habitsError || analyticsError) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl">
          <Typography color="error" variant="h6" gutterBottom>
            {habitsError?.message || analyticsError?.message || 'An error occurred'}
          </Typography>
          <Typography>
            Please try refreshing the page or contact support if the problem persists.
          </Typography>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl">
        {/* Page Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Track your habits and monitor your progress
          </Typography>
          {isOffline && (
            <Typography variant="body2" color="warning.main">
              You're currently offline. Changes will sync when you're back online.
            </Typography>
          )}
        </Box>

        {/* Statistics Overview */}
        <Box mb={4}>
          <Typography variant="h5" component="h2" gutterBottom>
            Statistics
          </Typography>
          <StatisticsGrid
            timeframe={AnalyticsTimeframe.DAILY}
            showRefreshButton
            className="dashboard-statistics"
          />
        </Box>

        {/* Habits Grid */}
        <Box mb={4}>
          <Typography variant="h5" component="h2" gutterBottom>
            Today's Habits
          </Typography>
          <HabitGrid
            habits={habits}
            onHabitComplete={handleHabitComplete}
            onHabitEdit={handleHabitEdit}
            onHabitReorder={handleHabitReorder}
            loading={!!updatingHabitId}
            virtualize={habits.length > 20}
            className="dashboard-habits"
          />
        </Box>
      </Container>
    </DashboardLayout>
  );
};

// Set display name for debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard;