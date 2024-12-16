/**
 * @fileoverview Comprehensive unit tests for notification service components
 * covering notification delivery, email service, caching, and security features.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import Redis from 'ioredis-mock';
import { Logger } from 'winston';
import { 
  NotificationService 
} from '../../src/services/notification.service';
import { 
  EmailService 
} from '../../src/services/email.service';
import { 
  NotificationType, 
  NotificationStatus, 
  NotificationPreference 
} from '../../src/interfaces/notification.interface';

// Mock dependencies
jest.mock('../../src/services/email.service');
jest.mock('winston');

// Test data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

const testNotification = {
  id: 'test-notification-id',
  userId: testUser.id,
  type: NotificationType.HABIT_REMINDER,
  title: 'Complete Your Habit',
  message: 'Time to meditate',
  status: NotificationStatus.PENDING,
  metadata: {
    habitName: 'Daily Meditation',
    userName: 'Test User',
    currentStreak: 5,
    locale: 'en',
    timezone: 'UTC'
  },
  scheduledFor: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

const testPreferences: NotificationPreference = {
  id: 'test-pref-id',
  userId: testUser.id,
  email: true,
  push: false,
  types: [NotificationType.HABIT_REMINDER, NotificationType.STREAK_ACHIEVEMENT],
  schedule: {
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    preferredTime: '09:00',
    frequency: 'DAILY'
  },
  timezone: 'UTC',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let emailService: jest.Mocked<EmailService>;
  let redisClient: Redis;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Initialize mocks
    emailService = {
      sendReminderEmail: jest.fn(),
      sendAchievementEmail: jest.fn()
    } as any;

    redisClient = new Redis();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;

    // Initialize service
    notificationService = new NotificationService(
      emailService,
      redisClient,
      logger
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisClient.flushall();
  });

  describe('Notification Delivery', () => {
    test('should successfully send a habit reminder notification', async () => {
      // Arrange
      emailService.sendReminderEmail.mockResolvedValueOnce(undefined);

      // Act
      await notificationService.sendNotification(testNotification);

      // Assert
      expect(emailService.sendReminderEmail).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          habitName: testNotification.metadata.habitName,
          userName: testNotification.metadata.userName
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated notification status'),
        expect.any(Object)
      );
    });

    test('should handle notification delivery failure with retry', async () => {
      // Arrange
      emailService.sendReminderEmail
        .mockRejectedValueOnce(new Error('Delivery failed'))
        .mockResolvedValueOnce(undefined);

      // Act & Assert
      await expect(notificationService.sendNotification(testNotification))
        .rejects
        .toThrow('Failed to process habit reminder');

      expect(emailService.sendReminderEmail).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Notification error',
        expect.any(Object)
      );
    });

    test('should respect rate limits for notifications', async () => {
      // Arrange
      const notifications = Array(101).fill(testNotification).map((n, i) => ({
        ...n,
        id: `test-notification-${i}`
      }));

      // Act & Assert
      const sendPromises = notifications.map(n => 
        notificationService.sendNotification(n)
      );

      await expect(Promise.all(sendPromises)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Notification Preferences', () => {
    test('should successfully update notification preferences', async () => {
      // Act
      await notificationService.updateNotificationPreferences(testPreferences);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Updated notification preferences',
        expect.any(Object)
      );
    });

    test('should validate notification preferences', async () => {
      // Arrange
      const invalidPreferences = { ...testPreferences, userId: '' };

      // Act & Assert
      await expect(
        notificationService.updateNotificationPreferences(invalidPreferences)
      ).rejects.toThrow('Invalid notification preferences');
    });
  });

  describe('Cache Management', () => {
    test('should cache user notifications', async () => {
      // Arrange
      const notifications = [testNotification];
      jest.spyOn(redisClient, 'get');
      jest.spyOn(redisClient, 'setex');

      // Act
      await notificationService.getUserNotifications(testUser.id);
      const secondCall = await notificationService.getUserNotifications(testUser.id);

      // Assert
      expect(redisClient.get).toHaveBeenCalledTimes(2);
      expect(redisClient.setex).toHaveBeenCalledTimes(1);
      expect(secondCall).toEqual([]);
    });

    test('should invalidate cache on preference update', async () => {
      // Arrange
      jest.spyOn(redisClient, 'del');

      // Act
      await notificationService.updateNotificationPreferences(testPreferences);

      // Assert
      expect(redisClient.del).toHaveBeenCalledWith(
        `notifications:${testPreferences.userId}`
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle email service errors', async () => {
      // Arrange
      emailService.sendReminderEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Act & Assert
      await expect(
        notificationService.sendNotification(testNotification)
      ).rejects.toThrow('Failed to process habit reminder');

      expect(logger.error).toHaveBeenCalledWith(
        'Notification error',
        expect.any(Object)
      );
    });

    test('should handle cache service errors', async () => {
      // Arrange
      jest.spyOn(redisClient, 'get').mockRejectedValue(
        new Error('Redis connection failed')
      );

      // Act & Assert
      await expect(
        notificationService.getUserNotifications(testUser.id)
      ).rejects.toThrow('Error fetching user notifications');

      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching user notifications',
        expect.any(Object)
      );
    });
  });

  describe('Achievement Notifications', () => {
    test('should send achievement notification', async () => {
      // Arrange
      const achievementNotification = {
        ...testNotification,
        type: NotificationType.STREAK_ACHIEVEMENT,
        title: 'New Achievement!',
        message: '7-Day Streak Achieved',
        metadata: {
          ...testNotification.metadata,
          streakCount: 7,
          achievementTitle: '7-Day Streak Master'
        }
      };

      emailService.sendAchievementEmail.mockResolvedValueOnce(undefined);

      // Act
      await notificationService.sendNotification(achievementNotification);

      // Assert
      expect(emailService.sendAchievementEmail).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          userName: achievementNotification.metadata.userName,
          achievementTitle: achievementNotification.metadata.achievementTitle
        })
      );
    });
  });
});