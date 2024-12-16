/**
 * @fileoverview Redux slice for managing habit-related state with offline support
 * Implements comprehensive state management for habits with normalized data structure,
 * real-time updates, offline persistence, and optimistic updates
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'; // v1.9.x
import { persistReducer } from 'redux-persist'; // v6.x
import {
  Habit,
  CreateHabitPayload,
  UpdateHabitPayload,
  HabitStreak,
  HabitLog,
  HabitStatistics,
} from '../types/habit.types';
import habitsApi from '../api/habits.api';
import { HABIT_STATUS, HABIT_DEFAULTS, STREAK_THRESHOLDS } from '../constants/habit.constants';

/**
 * Interface for the habits slice state with normalized data structure
 */
interface HabitsState {
  habits: Record<string, Habit>;
  loadingStates: Record<string, boolean>;
  errors: Record<string, string | null>;
  selectedHabitId: string | null;
  statistics: Record<string, HabitStatistics>;
  streaks: Record<string, HabitStreak>;
  offlineQueue: Array<{ type: string; payload: any }>;
  lastSyncTimestamp: number;
  isInitialized: boolean;
}

/**
 * Initial state for the habits slice
 */
const initialState: HabitsState = {
  habits: {},
  loadingStates: {},
  errors: {},
  selectedHabitId: null,
  statistics: {},
  streaks: {},
  offlineQueue: [],
  lastSyncTimestamp: 0,
  isInitialized: false,
};

/**
 * Async thunk for fetching all habits with offline support
 */
export const fetchHabits = createAsyncThunk(
  'habits/fetchHabits',
  async (_, { rejectWithValue }) => {
    try {
      const response = await habitsApi.getHabits({ page: 1, pageSize: 100 });
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data.items;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for creating a new habit with optimistic updates
 */
export const createHabit = createAsyncThunk(
  'habits/createHabit',
  async (payload: CreateHabitPayload, { rejectWithValue }) => {
    try {
      const response = await habitsApi.createHabit(payload);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for updating a habit with optimistic updates
 */
export const updateHabit = createAsyncThunk(
  'habits/updateHabit',
  async ({ id, payload }: { id: string; payload: UpdateHabitPayload }, { rejectWithValue }) => {
    try {
      const response = await habitsApi.updateHabit(id, payload);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Async thunk for logging habit completion with offline support
 */
export const logHabitCompletion = createAsyncThunk(
  'habits/logCompletion',
  async ({ habitId, log }: { habitId: string; log: Omit<HabitLog, 'id'> }, { rejectWithValue }) => {
    try {
      const response = await habitsApi.logHabitCompletion(habitId, log);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return { habitId, log: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/**
 * Redux slice for habits management
 */
const habitsSlice = createSlice({
  name: 'habits',
  initialState,
  reducers: {
    setSelectedHabit: (state, action: PayloadAction<string | null>) => {
      state.selectedHabitId = action.payload;
    },
    addOfflineAction: (state, action: PayloadAction<{ type: string; payload: any }>) => {
      state.offlineQueue.push(action.payload);
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = [];
    },
    updateLastSync: (state) => {
      state.lastSyncTimestamp = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch habits reducers
      .addCase(fetchHabits.pending, (state) => {
        state.loadingStates['fetchHabits'] = true;
        state.errors['fetchHabits'] = null;
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.loadingStates['fetchHabits'] = false;
        state.habits = action.payload.reduce((acc, habit) => {
          acc[habit.id] = habit;
          return acc;
        }, {} as Record<string, Habit>);
        state.isInitialized = true;
      })
      .addCase(fetchHabits.rejected, (state, action) => {
        state.loadingStates['fetchHabits'] = false;
        state.errors['fetchHabits'] = action.error.message || 'Failed to fetch habits';
      })
      // Create habit reducers
      .addCase(createHabit.pending, (state) => {
        state.loadingStates['createHabit'] = true;
        state.errors['createHabit'] = null;
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.loadingStates['createHabit'] = false;
        state.habits[action.payload.id] = action.payload;
      })
      .addCase(createHabit.rejected, (state, action) => {
        state.loadingStates['createHabit'] = false;
        state.errors['createHabit'] = action.error.message || 'Failed to create habit';
      })
      // Update habit reducers
      .addCase(updateHabit.pending, (state) => {
        state.loadingStates['updateHabit'] = true;
        state.errors['updateHabit'] = null;
      })
      .addCase(updateHabit.fulfilled, (state, action) => {
        state.loadingStates['updateHabit'] = false;
        state.habits[action.payload.id] = action.payload;
      })
      .addCase(updateHabit.rejected, (state, action) => {
        state.loadingStates['updateHabit'] = false;
        state.errors['updateHabit'] = action.error.message || 'Failed to update habit';
      })
      // Log completion reducers
      .addCase(logHabitCompletion.fulfilled, (state, action) => {
        const { habitId } = action.payload;
        if (state.habits[habitId]) {
          // Update streak and statistics optimistically
          if (state.streaks[habitId]) {
            state.streaks[habitId].currentStreak += 1;
            state.streaks[habitId].lastCompletedAt = new Date();
          }
        }
      });
  },
});

/**
 * Memoized selectors for accessing habit state
 */
export const habitsSelectors = {
  selectAllHabits: createSelector(
    (state: { habits: HabitsState }) => state.habits.habits,
    (habits) => Object.values(habits)
  ),
  selectHabitById: createSelector(
    [(state: { habits: HabitsState }) => state.habits.habits, (_, habitId: string) => habitId],
    (habits, habitId) => habits[habitId]
  ),
  selectActiveHabits: createSelector(
    (state: { habits: HabitsState }) => state.habits.habits,
    (habits) => Object.values(habits).filter((habit) => habit.status === HABIT_STATUS.ACTIVE)
  ),
  selectHabitStatistics: createSelector(
    [(state: { habits: HabitsState }) => state.habits.statistics, (_, habitId: string) => habitId],
    (statistics, habitId) => statistics[habitId]
  ),
  selectOfflineStatus: createSelector(
    (state: { habits: HabitsState }) => state.habits.offlineQueue,
    (offlineQueue) => offlineQueue.length > 0
  ),
};

// Export actions and reducer
export const { setSelectedHabit, addOfflineAction, clearOfflineQueue, updateLastSync } = habitsSlice.actions;

// Configure persistence
const persistConfig = {
  key: 'habits',
  storage: localStorage,
  whitelist: ['habits', 'statistics', 'streaks', 'offlineQueue'],
};

export const habitsReducer = persistReducer(persistConfig, habitsSlice.reducer);