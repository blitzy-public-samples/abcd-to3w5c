/**
 * @fileoverview Redux slice for managing application notifications with queue management
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.x
import { ApiResponse } from '../types/api.types';
import { v4 as uuidv4 } from 'uuid'; // v9.0.x
import DOMPurify from 'dompurify'; // v3.0.x

// Constants
export const DEFAULT_NOTIFICATION_DURATION = 5000;
export const MAX_NOTIFICATIONS = 5;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
} as const;

type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Interfaces
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  timestamp: Date;
  priority?: number;
  ariaLabel?: string;
}

export interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
  isProcessing: boolean;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  maxNotifications: MAX_NOTIFICATIONS,
  isProcessing: false,
};

// Timeout map for managing notification removal
const notificationTimeouts = new Map<string, number>();

/**
 * Helper function to sanitize notification messages
 */
const sanitizeMessage = (message: string): string => {
  return DOMPurify.sanitize(message, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] });
};

/**
 * Helper function to update aria-live region
 */
const updateAriaLive = (message: string, type: NotificationType): void => {
  const ariaLive = document.getElementById('notification-live-region');
  if (ariaLive) {
    ariaLive.textContent = message;
    ariaLive.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  }
};

/**
 * Notification slice with reducers and actions
 */
export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: {
      prepare: (payload: {
        type: NotificationType;
        message: string;
        duration?: number;
        priority?: number;
        ariaLabel?: string;
      }) => {
        return {
          payload: {
            id: uuidv4(),
            type: payload.type,
            message: sanitizeMessage(payload.message),
            duration: payload.duration || DEFAULT_NOTIFICATION_DURATION,
            timestamp: new Date(),
            priority: payload.priority || 1,
            ariaLabel: payload.ariaLabel,
          },
        };
      },
      reducer: (state, action: PayloadAction<Notification>) => {
        // Sort notifications by priority and timestamp
        const sortedNotifications = [...state.notifications, action.payload].sort(
          (a, b) => (b.priority || 1) - (a.priority || 1) || b.timestamp.getTime() - a.timestamp.getTime()
        );

        // Limit to max notifications
        state.notifications = sortedNotifications.slice(0, state.maxNotifications);

        // Update accessibility
        updateAriaLive(action.payload.message, action.payload.type);

        // Schedule removal
        const timeoutId = window.setTimeout(() => {
          notificationSlice.actions.removeNotification(action.payload.id);
        }, action.payload.duration);

        notificationTimeouts.set(action.payload.id, timeoutId);
      },
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      // Clear timeout
      const timeoutId = notificationTimeouts.get(action.payload);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        notificationTimeouts.delete(action.payload);
      }

      // Remove notification
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },

    clearNotifications: (state) => {
      // Clear all timeouts
      state.notifications.forEach(notification => {
        const timeoutId = notificationTimeouts.get(notification.id);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          notificationTimeouts.delete(notification.id);
        }
      });

      // Clear notifications
      state.notifications = [];
      state.isProcessing = false;

      // Update accessibility
      updateAriaLive('All notifications cleared', 'info');
    },

    // Handle API response notifications
    handleApiResponse: {
      prepare: (response: ApiResponse<any>, successMessage?: string) => {
        return {
          payload: {
            success: response.success,
            message: response.success
              ? successMessage || 'Operation completed successfully'
              : response.error?.message || 'An error occurred',
          },
        };
      },
      reducer: (state, action: PayloadAction<{ success: boolean; message: string }>) => {
        const notification = {
          id: uuidv4(),
          type: action.payload.success ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.ERROR,
          message: sanitizeMessage(action.payload.message),
          timestamp: new Date(),
          duration: DEFAULT_NOTIFICATION_DURATION,
          priority: action.payload.success ? 1 : 3,
        };

        state.notifications = [
          ...state.notifications,
          notification,
        ].slice(0, state.maxNotifications);

        updateAriaLive(notification.message, notification.type);

        const timeoutId = window.setTimeout(() => {
          notificationSlice.actions.removeNotification(notification.id);
        }, DEFAULT_NOTIFICATION_DURATION);

        notificationTimeouts.set(notification.id, timeoutId);
      },
    },
  },
});

// Export actions and reducer
export const notificationActions = notificationSlice.actions;
export default notificationSlice.reducer;

// Selector for getting current notifications
export const selectNotifications = (state: { notification: NotificationState }) =>
  state.notification.notifications;

// Type-guard for notification type checking
export const isValidNotificationType = (type: string): type is NotificationType =>
  Object.values(NOTIFICATION_TYPES).includes(type as NotificationType);