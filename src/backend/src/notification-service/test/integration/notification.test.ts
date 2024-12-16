/**
 * @fileoverview Integration tests for the notification service with comprehensive coverage
 * of notification delivery, caching, preferences, and error handling scenarios.
 * 
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing'; // ^9.0.0
import Redis from 'ioredis'; // ^5.3.0
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals'; // ^29.0.0
import { NotificationService } from '../../src/services/notification.service';
import { EmailService } from '../../src/services/email.service';
import {
  NotificationType,
  NotificationStatus,
  NotificationPreference,
  Notification
} from '../../src/interfaces/notification.interface';

// Test constants
const TEST_USER_ID = 'test-user-123';
const TEST_HABIT_ID = 'test-habit-456';
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  sendLatency: 200, // ms
  retrievalLatency: 100, // ms
  cacheHitRatio: 0.8 // 80%
};

describe('NotificationService Integration Tests', () => {
  let module: TestingModule;
  let notificationService: NotificationService;
  let emailService: EmailService;
  let redisClient: Redis.Cluster;
  let performanceMetrics: {
    sendLatencies: number[];
    retrievalLatencies: number[];
    cacheHits: number;
    cacheMisses: number;
  };

  beforeAll(async () => {
    // Initialize test module with real dependencies
    module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailService,
          useValue: {
            sendReminderEmail: jest.fn(),
            sendAchievementEmail: jest.fn(),
            verifyDelivery: jest.fn()
          }
        },
        {
          provide: 'RedisClient',
          useValue: new Redis.Cluster([REDIS_CONFIG])
        }
      ]
    }).compile();

    notificationService = module.get<NotificationService>(NotificationService);
    emailService = module.get<EmailService>(EmailService);
    redisClient = module.get<Redis.Cluster>('RedisClient');

    // Initialize performance metrics
    performanceMetrics = {
      sendLatencies: [],
      retrievalLatencies: [],
      cacheHits: 0,
      cacheMisses: 0
    };
  });

  afterAll(async () => {
    // Cleanup resources
    await redisClient.quit();
    await module.close();

    // Log performance metrics
    console.info('Performance Metrics:', {
      averageSendLatency: calculateAverage(performanceMetrics.sendLatencies),
      averageRetrievalLatency: calculateAverage(performanceMetrics.retrievalLatencies),
      cacheHitRatio: performanceMetrics.cacheHits / 
        (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)
    });
  });

  beforeEach(async () => {
    // Clear Redis cache and reset mocks
    await redisClient.flushall();
    jest.clearAllMocks();
  });

  describe('Notification Sending', () => {
    it('should successfully send a habit reminder notification', async () => {
      // Prepare test data
      const notification: Notification = {
        id: 'test-notification-1',
        userId: TEST_USER_ID,
        type: NotificationType.HABIT_REMINDER,
        title: 'Time for your habit!',
        message: 'Remember to complete your daily meditation',
        status: NotificationStatus.PENDING,
        metadata: {
          habitId: TEST_HABIT_ID,
          habitName: 'Daily Meditation',
          userName: 'Test User',
          currentStreak: 5,
          templateId: 'reminder-template',
          customData: {
            timezone: 'UTC',
            locale: 'en'
          }
        },
        priority: 'high',
        retryCount: 0,
        scheduledFor: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Measure send latency
      const startTime = Date.now();
      await notificationService.sendNotification(notification);
      performanceMetrics.sendLatencies.push(Date.now() - startTime);

      // Verify email service was called correctly
      expect(emailService.sendReminderEmail).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          habitName: 'Daily Meditation',
          userName: 'Test User',
          currentStreak: 5
        })
      );

      // Verify notification status was updated
      const updatedNotification = await notificationService.getUserNotifications(TEST_USER_ID);
      expect(updatedNotification[0].status).toBe(NotificationStatus.SENT);
    });

    it('should successfully send an achievement notification', async () => {
      const notification: Notification = {
        id: 'test-notification-2',
        userId: TEST_USER_ID,
        type: NotificationType.STREAK_ACHIEVEMENT,
        title: 'Achievement Unlocked!',
        message: 'Congratulations on your 7-day streak!',
        status: NotificationStatus.PENDING,
        metadata: {
          habitId: TEST_HABIT_ID,
          habitName: 'Daily Meditation',
          userName: 'Test User',
          streakCount: 7,
          templateId: 'achievement-template',
          customData: {
            isDarkMode: false,
            locale: 'en'
          }
        },
        priority: 'high',
        retryCount: 0,
        scheduledFor: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const startTime = Date.now();
      await notificationService.sendNotification(notification);
      performanceMetrics.sendLatencies.push(Date.now() - startTime);

      expect(emailService.sendAchievementEmail).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          achievementTitle: 'Achievement Unlocked!',
          streakCount: 7,
          habitName: 'Daily Meditation'
        })
      );
    });

    it('should handle notification failures and retry logic', async () => {
      // Mock email service to fail initially
      emailService.sendReminderEmail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(true);

      const notification: Notification = {
        id: 'test-notification-3',
        userId: TEST_USER_ID,
        type: NotificationType.HABIT_REMINDER,
        title: 'Retry Test',
        message: 'Testing retry logic',
        status: NotificationStatus.PENDING,
        metadata: {
          habitId: TEST_HABIT_ID,
          templateId: 'reminder-template'
        },
        priority: 'high',
        retryCount: 0,
        scheduledFor: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await notificationService.sendNotification(notification);

      // Verify retry attempt was made
      expect(emailService.sendReminderEmail).toHaveBeenCalledTimes(2);
      
      // Verify final status
      const notifications = await notificationService.getUserNotifications(TEST_USER_ID);
      expect(notifications[0].status).toBe(NotificationStatus.SENT);
    });
  });

  describe('Notification Preferences', () => {
    it('should update and respect notification preferences', async () => {
      const preferences: NotificationPreference = {
        id: 'pref-1',
        userId: TEST_USER_ID,
        email: true,
        push: false,
        types: [NotificationType.HABIT_REMINDER],
        schedule: {
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          preferredTime: '09:00',
          frequency: 'DAILY'
        },
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await notificationService.updateNotificationPreferences(preferences);

      // Verify preferences are respected when sending notifications
      const notification: Notification = {
        id: 'test-notification-4',
        userId: TEST_USER_ID,
        type: NotificationType.STREAK_ACHIEVEMENT,
        title: 'Should Not Send',
        message: 'This type is not in preferences',
        status: NotificationStatus.PENDING,
        metadata: { templateId: 'achievement-template' },
        priority: 'low',
        retryCount: 0,
        scheduledFor: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await notificationService.sendNotification(notification);
      expect(emailService.sendAchievementEmail).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Caching', () => {
    it('should maintain acceptable response times and cache hit ratios', async () => {
      // Create test notifications
      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-test-${i}`,
        userId: TEST_USER_ID,
        type: NotificationType.HABIT_REMINDER,
        title: `Performance Test ${i}`,
        message: 'Testing performance',
        status: NotificationStatus.SENT,
        metadata: { templateId: 'reminder-template' },
        priority: 'medium',
        retryCount: 0,
        scheduledFor: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Test retrieval performance with caching
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        const result = await notificationService.getUserNotifications(TEST_USER_ID);
        performanceMetrics.retrievalLatencies.push(Date.now() - startTime);

        if (result.length > 0) {
          performanceMetrics.cacheHits++;
        } else {
          performanceMetrics.cacheMisses++;
        }
      }

      // Assert performance metrics
      const avgRetrievalLatency = calculateAverage(performanceMetrics.retrievalLatencies);
      const cacheHitRatio = performanceMetrics.cacheHits / 
        (performanceMetrics.cacheHits + performanceMetrics.cacheMisses);

      expect(avgRetrievalLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.retrievalLatency);
      expect(cacheHitRatio).toBeGreaterThan(PERFORMANCE_THRESHOLDS.cacheHitRatio);
    });
  });
});

/**
 * Calculates the average of an array of numbers
 */
function calculateAverage(numbers: number[]): number {
  return numbers.length > 0 
    ? numbers.reduce((a, b) => a + b, 0) / numbers.length 
    : 0;
}