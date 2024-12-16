/**
 * @fileoverview Advanced React hook for enterprise-grade notification management
 * @version 1.0.0
 */

import { useCallback, useRef, useEffect } from 'react'; // v18.x
import { useDispatch, useSelector } from 'react-redux'; // v8.x
import { notificationActions, selectNotifications } from '../store/notification.slice';
import type { ApiResponse } from '../types/api.types';

// Constants for notification management
const DEFAULT_NOTIFICATION_DURATION = 3000;
const MAX_NOTIFICATIONS = 5;
const ANIMATION_DURATION = 300;
const DEBOUNCE_DELAY = 100;

/**
 * Notification priority levels affecting display and dismiss behavior
 */
export enum NotificationPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
}

/**
 * Reasons for notification dismissal (for analytics)
 */
export enum DismissReason {
  AUTO = 'auto',
  USER = 'user',
  REPLACED = 'replaced',
  CLEANUP = 'cleanup',
}

/**
 * Interface for notification management functions and state
 */
export interface UseNotificationReturn {
  showNotification: (params: {
    message: string;
    type: keyof typeof NOTIFICATION_TYPES;
    duration?: number;
    priority?: NotificationPriority;
    ariaLabel?: string;
    onAction?: () => void;
  }) => void;
  hideNotification: (id: string, reason: DismissReason) => void;
  clearAllNotifications: () => void;
  notifications: ReadonlyArray<Notification>;
}

/**
 * Advanced hook for managing application notifications with accessibility,
 * analytics, and performance optimizations
 */
export const useNotification = (): UseNotificationReturn => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const animationFrameRef = useRef<number>();
  const notificationQueueRef = useRef<Array<Parameters<UseNotificationReturn['showNotification']>[0]>>([]);
  const debounceTimerRef = useRef<number>();

  /**
   * Process notification queue with priority handling and animation frame optimization
   */
  const processNotificationQueue = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      if (notificationQueueRef.current.length === 0) return;

      // Sort queue by priority
      const sortedQueue = [...notificationQueueRef.current].sort(
        (a, b) => (b.priority || NotificationPriority.LOW) - (a.priority || NotificationPriority.LOW)
      );

      // Process next notification
      const nextNotification = sortedQueue[0];
      if (nextNotification) {
        dispatch(
          notificationActions.addNotification({
            type: nextNotification.type,
            message: nextNotification.message,
            duration: nextNotification.duration || DEFAULT_NOTIFICATION_DURATION,
            priority: nextNotification.priority || NotificationPriority.LOW,
            ariaLabel: nextNotification.ariaLabel,
          })
        );

        // Remove processed notification from queue
        notificationQueueRef.current = notificationQueueRef.current.filter(
          (_, index) => index !== 0
        );

        // Schedule next queue processing
        if (notificationQueueRef.current.length > 0) {
          animationFrameRef.current = requestAnimationFrame(processNotificationQueue);
        }
      }
    }, DEBOUNCE_DELAY);
  }, [dispatch]);

  /**
   * Show notification with queue management and accessibility support
   */
  const showNotification = useCallback(
    (params: Parameters<UseNotificationReturn['showNotification']>[0]) => {
      // Add to queue
      notificationQueueRef.current.push(params);

      // Start queue processing if not already running
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(processNotificationQueue);
      }

      // Handle action callback if provided
      if (params.onAction) {
        const timeoutId = window.setTimeout(params.onAction, params.duration || DEFAULT_NOTIFICATION_DURATION);
        return () => window.clearTimeout(timeoutId);
      }
    },
    [processNotificationQueue]
  );

  /**
   * Hide notification with analytics tracking
   */
  const hideNotification = useCallback(
    (id: string, reason: DismissReason) => {
      dispatch(notificationActions.removeNotification(id));

      // Track dismissal analytics
      try {
        // Analytics tracking would go here
        console.debug(`Notification dismissed: ${id}, Reason: ${reason}`);
      } catch (error) {
        console.error('Analytics tracking failed:', error);
      }
    },
    [dispatch]
  );

  /**
   * Clear all notifications with proper cleanup
   */
  const clearAllNotifications = useCallback(() => {
    // Clear animation frame and queue
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    notificationQueueRef.current = [];

    // Clear all notifications
    dispatch(notificationActions.clearNotifications());
  }, [dispatch]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    showNotification,
    hideNotification,
    clearAllNotifications,
    notifications: Object.freeze(notifications), // Return immutable notifications array
  };
};

// Default export for convenient importing
export default useNotification;