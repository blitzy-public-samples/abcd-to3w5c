import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Button,
  Dialog,
  Skeleton,
  Alert
} from '@mui/material';
import { Habit, HabitStatistics } from '../../types/habit.types';
import HabitStats from '../components/habits/HabitStats';
import useHabits from '../../hooks/useHabits';
import ErrorBoundary from '../components/common/ErrorBoundary';

interface HabitDetailsState {
  habit: Habit | null;
  isEditing: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
}

const HabitDetails: React.FC = () => {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const {
    habits,
    updateHabit,
    deleteHabit,
    logCompletion,
    isOffline
  } = useHabits();

  // Component state
  const [state, setState] = useState<HabitDetailsState>({
    habit: null,
    isEditing: false,
    isDeleting: false,
    isLoading: true,
    error: null,
    lastUpdate: null
  });

  // Load habit data
  useEffect(() => {
    if (!habitId) {
      setState(prev => ({
        ...prev,
        error: new Error('Invalid habit ID'),
        isLoading: false
      }));
      return;
    }

    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      setState(prev => ({
        ...prev,
        habit,
        isLoading: false,
        lastUpdate: new Date()
      }));
    } else {
      setState(prev => ({
        ...prev,
        error: new Error('Habit not found'),
        isLoading: false
      }));
    }
  }, [habitId, habits]);

  // Handle habit completion
  const handleComplete = useCallback(async () => {
    if (!state.habit) return;

    try {
      await logCompletion(state.habit.id);
      setState(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error
      }));
    }
  }, [state.habit, logCompletion]);

  // Handle habit deletion
  const handleDelete = useCallback(async () => {
    if (!state.habit) return;

    try {
      await deleteHabit(state.habit.id);
      navigate('/habits');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error
      }));
    }
  }, [state.habit, deleteHabit, navigate]);

  // Handle statistics update
  const handleStatsUpdate = useCallback((statistics: HabitStatistics) => {
    setState(prev => ({
      ...prev,
      habit: prev.habit ? {
        ...prev.habit,
        statistics
      } : null,
      lastUpdate: new Date()
    }));
  }, []);

  // Loading state
  if (state.isLoading) {
    return (
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={8}>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={100} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Error state
  if (state.error) {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load habit details"
        fallbackDescription={state.error.message}
        onError={console.error}
      />
    );
  }

  // No habit found
  if (!state.habit) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">
          Habit not found. Please check the URL and try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {isOffline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You are currently offline. Changes will be synchronized when you're back online.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Habit Header */}
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            {state.habit.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {state.habit.description}
          </Typography>
        </Grid>

        {/* Habit Statistics */}
        <Grid item xs={12} md={8}>
          <HabitStats
            habitId={state.habit.id}
            statistics={state.habit.statistics}
            onUpdate={handleStatsUpdate}
          />
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleComplete}
                disabled={isOffline}
              >
                Complete Today
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={() => setState(prev => ({ ...prev, isEditing: true }))}
              >
                Edit Habit
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => setState(prev => ({ ...prev, isDeleting: true }))}
              >
                Delete Habit
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={state.isDeleting}
        onClose={() => setState(prev => ({ ...prev, isDeleting: false }))}
        aria-labelledby="delete-dialog-title"
      >
        <Typography variant="h6" id="delete-dialog-title" sx={{ p: 2 }}>
          Delete Habit
        </Typography>
        <Typography variant="body1" sx={{ px: 2, pb: 2 }}>
          Are you sure you want to delete this habit? This action cannot be undone.
        </Typography>
        <Grid container spacing={2} sx={{ p: 2 }}>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setState(prev => ({ ...prev, isDeleting: false }))}
            >
              Cancel
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Grid>
        </Grid>
      </Dialog>
    </Container>
  );
};

export default HabitDetails;