/**
 * @fileoverview Defines comprehensive TypeScript interfaces and types for the notification service.
 * Includes notification templates, delivery preferences, status tracking, and metadata management.
 * 
 * @version 1.0.0
 * @module NotificationInterfaces
 */

import { BaseEntity } from '../../../shared/interfaces/base.interface';

/**
 * Enumeration of all supported notification types in the system.
 * Used to categorize and handle different types of notifications.
 */
export enum NotificationType {
  HABIT_REMINDER = 'HABIT_REMINDER',
  STREAK_ACHIEVEMENT = 'STREAK_ACHIEVEMENT',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  STREAK_WARNING = 'STREAK_WARNING',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}

/**
 * Enumeration tracking the delivery status of notifications.
 * Used for monitoring and reporting notification delivery lifecycle.
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRYING = 'RETRYING'
}

/**
 * Enumeration defining notification priority levels.
 * Determines notification delivery urgency and retry policies.
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Enumeration defining notification frequency options.
 * Controls how often notifications are sent to users.
 */
export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

/**
 * Union type for supported notification channels.
 * Extensible for future channel additions.
 */
export type NotificationChannel = 'email' | 'push';

/**
 * Interface defining user notification timing preferences.
 * Manages quiet hours and preferred notification times.
 */
export interface NotificationSchedule {
  /** Start time for quiet hours (24-hour format, e.g., "22:00") */
  quietHoursStart: string;
  
  /** End time for quiet hours (24-hour format, e.g., "07:00") */
  quietHoursEnd: string;
  
  /** Preferred time for receiving notifications (24-hour format) */
  preferredTime: string;
  
  /** How frequently notifications should be sent */
  frequency: NotificationFrequency;
}

/**
 * Interface for structured notification metadata.
 * Contains additional context and tracking information.
 */
export interface NotificationMetadata {
  /** Reference to the notification template used */
  templateId: string;
  
  /** Associated habit ID if notification is habit-related */
  habitId?: string;
  
  /** Associated achievement ID for achievement notifications */
  achievementId?: string;
  
  /** Additional custom data for specific notification types */
  customData?: Record<string, unknown>;
}

/**
 * Interface managing user notification preferences.
 * Controls notification delivery channels and schedules.
 */
export interface NotificationPreference extends BaseEntity {
  /** User ID associated with these preferences */
  userId: string;
  
  /** Whether email notifications are enabled */
  email: boolean;
  
  /** Whether push notifications are enabled */
  push: boolean;
  
  /** Array of notification types the user has opted into */
  types: NotificationType[];
  
  /** User's notification schedule preferences */
  schedule: NotificationSchedule;
  
  /** User's timezone for notification delivery */
  timezone: string;
}

/**
 * Core notification entity interface.
 * Contains complete tracking and delivery information for notifications.
 */
export interface Notification extends BaseEntity {
  /** User ID of the notification recipient */
  userId: string;
  
  /** Type of notification */
  type: NotificationType;
  
  /** Notification title */
  title: string;
  
  /** Notification message content */
  message: string;
  
  /** Current delivery status */
  status: NotificationStatus;
  
  /** Additional metadata and context */
  metadata: NotificationMetadata;
  
  /** Notification priority level */
  priority: NotificationPriority;
  
  /** Number of delivery retry attempts */
  retryCount: number;
  
  /** Scheduled delivery time */
  scheduledFor: Date;
}