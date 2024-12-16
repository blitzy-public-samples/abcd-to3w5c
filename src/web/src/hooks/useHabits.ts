/**
 * @fileoverview Custom React hook for managing habits state and operations
 * Provides unified interface for habit management with offline support and optimistic updates
 * @version 1.0.0
 */

import { useCallback, useEffect } from 'react'; // v18.x
import { useDispatch, useSelector } from 'react-redux'; // v8.x
import { useErrorBoundary } from 'react-error-boundary'; // v4.x
import {
  selectHabits,
  selectLoading,
  selectError,
  fetchHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
  addOfflineAction,
  clearOfflineQueue,
  updateLastSync
} from '../store/habits.slice';
import habitsApi from '../api/habits.api';
import { 
  Habit, 
  CreateHabitPayload, 
  UpdateHabitPayload, 
  HabitLog 
} from '../types/habit.types';
import { HABIT_STATUS } from '../constants/habit.constants';

/**
 * Custom error type for habit operations
 */
interface HabitError {
  code: string;
  message: string;
  type: 'NetworkError' | 'ValidationError' | 'AuthError';
  retryable: boolean;
}

/**
 * Return type for useHabits hook
 */
interface UseHabitsReturn {
  habits: Habit[];
  loading: boolean;
  error: HabitError | null;
  createHabit: (payload: CreateHabitPayload) => Promise<void>;
  updateHabit: (id: string, payload: UpdateHabitPayload) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  logCompletion: (id: string) => Promise<void>;
  syncOfflineData: () => Promise<void>;
  isOffline: boolean;
}

/**
 * Custom hook for managing habits with offline support and optimistic updates
 */
export const useHabits = (): UseHabitsReturn => {
  const dispatch = useDispatch();
  const { showBoundary } = useErrorBoundary();
  
  // Redux selectors
  const habits = useSelector(selectHabits);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  
  // Online status tracking
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Initialize habits data and online status monitoring
   */
  useEffect(() => {
    const handleOnlineStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      
      if (!offline) {
        syncOfflineData();
      }
    };

    // Initial fetch
    dispatch(fetchHabits());

    // Setup online/offline listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [dispatch]);

  /**
   * Create new habit with optimistic update and offline support
   */
  const createHabit = useCallback(async (payload: CreateHabitPayload): Promise<void> => {
    try {
      if (isOffline) {
        // Optimistic update with temporary ID
        const tempHabit: Habit = {
          id: `temp_${Date.now()}`,
          ...payload,
          status: HABIT_STATUS.ACTIVE,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        dispatch(addOfflineAction({ 
          type: 'CREATE_HABIT',
          payload: tempHabit 
        }));
        return;
      }

      const result = await dispatch(createHabit(payload)).unwrap();
      if (!result.success) {
        throw result.error;
      }
    } catch (error) {
      showBoundary(error);
    }
  }, [dispatch, isOffline, showBoundary]);

  /**
   * Update habit with optimistic update and offline support
   */
  const updateHabit = useCallback(async (
    id: string, 
    payload: UpdateHabitPayload
  ): Promise<void> => {
    try {
      if (isOffline) {
        dispatch(addOfflineAction({
          type: 'UPDATE_HABIT',
          payload: { id, updates: payload }
        }));
        return;
      }

      const result = await dispatch(updateHabit({ id, payload })).unwrap();
      if (!result.success) {
        throw result.error;
      }
    } catch (error) {
      showBoundary(error);
    }
  }, [dispatch, isOffline, showBoundary]);

  /**
   * Delete habit with optimistic update and offline support
   */
  const deleteHabit = useCallback(async (id: string): Promise<void> => {
    try {
      if (isOffline) {
        dispatch(addOfflineAction({
          type: 'DELETE_HABIT',
          payload: { id }
        }));
        return;
      }

      const result = await dispatch(deleteHabit(id)).unwrap();
      if (!result.success) {
        throw result.error;
      }
    } catch (error) {
      showBoundary(error);
    }
  }, [dispatch, isOffline, showBoundary]);

  /**
   * Log habit completion with optimistic update and offline support
   */
  const logCompletion = useCallback(async (id: string): Promise<void> => {
    try {
      const log: Omit<HabitLog, 'id'> = {
        habitId: id,
        completedAt: new Date(),
        notes: null,
        mood: null
      };

      if (isOffline) {
        dispatch(addOfflineAction({
          type: 'LOG_COMPLETION',
          payload: { habitId: id, log }
        }));
        return;
      }

      const result = await dispatch(logHabitCompletion({ habitId: id, log })).unwrap();
      if (!result.success) {
        throw result.error;
      }
    } catch (error) {
      showBoundary(error);
    }
  }, [dispatch, isOffline, showBoundary]);

  /**
   * Synchronize offline data when connection is restored
   */
  const syncOfflineData = useCallback(async (): Promise<void> => {
    try {
      const offlineQueue = useSelector((state) => state.habits.offlineQueue);
      
      for (const action of offlineQueue) {
        switch (action.type) {
          case 'CREATE_HABIT':
            await habitsApi.createHabit(action.payload);
            break;
          case 'UPDATE_HABIT':
            await habitsApi.updateHabit(action.payload.id, action.payload.updates);
            break;
          case 'DELETE_HABIT':
            await habitsApi.deleteHabit(action.payload.id);
            break;
          case 'LOG_COMPLETION':
            await habitsApi.logHabitCompletion(
              action.payload.habitId,
              action.payload.log
            );
            break;
        }
      }

      dispatch(clearOfflineQueue());
      dispatch(updateLastSync());
      dispatch(fetchHabits());
    } catch (error) {
      showBoundary(error);
    }
  }, [dispatch, showBoundary]);

  return {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    logCompletion,
    syncOfflineData,
    isOffline
  };
};

export default useHabits;