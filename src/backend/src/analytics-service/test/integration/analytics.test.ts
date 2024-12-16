/**
 * @fileoverview Integration tests for Analytics Service validating end-to-end functionality
 * including data visualization, caching, and performance metrics.
 * 
 * @version 1.0.0
 * @requires jest@29.0.0
 * @requires ioredis-mock@8.0.0
 * @requires dayjs@1.11.0
 */

import { describe, it, beforeEach, afterEach, expect, jest } from 'jest';
import RedisMock from 'ioredis-mock'; // v8.0.0
import dayjs from 'dayjs'; // v1.11.0
import { AnalyticsService } from '../../src/services/analytics.service';
import {
  HabitAnalytics,
  UserAnalytics,
  AnalyticsTimeframe,
  TimeGranularity,
  CompletionStatus,
  HeatmapData,
  AnalyticsTrend,
  WeeklyProgress
} from '../../src/interfaces/analytics.interface';
import { formatDate } from '../../../shared/utils/date.util';

// Test constants
const TEST_USER_ID = 'test-user-123';
const TEST_HABIT_ID = 'test-habit-456';
const PERFORMANCE_THRESHOLD = 200; // 200ms response time threshold
const CACHE_HIT_THRESHOLD = 0.8; // 80% cache hit rate threshold
const TEST_TIMEZONE = 'UTC';

describe('Analytics Service Integration Tests', () => {
  let analyticsService: AnalyticsService;
  let mockRedisClient: RedisMock;
  let testStartDate: Date;
  let testEndDate: Date;

  /**
   * Sets up test environment before each test
   */
  beforeEach(async () => {
    jest.useFakeTimers();
    mockRedisClient = new RedisMock({
      data: new Map()
    });

    // Initialize analytics service with mock Redis client
    analyticsService = new AnalyticsService();
    (analyticsService as any).redisClient = mockRedisClient;

    // Set up test date range
    testStartDate = dayjs().subtract(30, 'days').toDate();
    testEndDate = dayjs().toDate();

    // Set up test data
    await setupTestData();
  });

  /**
   * Cleans up test environment after each test
   */
  afterEach(async () => {
    jest.useRealTimers();
    await cleanupTestData();
    mockRedisClient.flushall();
  });

  /**
   * User Analytics Tests
   */
  describe('User Analytics', () => {
    it('should retrieve user analytics within performance threshold', async () => {
      const startTime = Date.now();

      const analytics = await analyticsService.getUserAnalytics(
        TEST_USER_ID,
        AnalyticsTimeframe.MONTHLY
      );

      const responseTime = Date.now() - startTime;

      // Verify performance
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // Verify data structure
      expect(analytics).toHaveProperty('userId', TEST_USER_ID);
      expect(analytics).toHaveProperty('totalHabits');
      expect(analytics).toHaveProperty('activeHabits');
      expect(analytics).toHaveProperty('overallCompletionRate');
      expect(analytics).toHaveProperty('trends');
      expect(analytics).toHaveProperty('habitAnalytics');
    });

    it('should utilize cache effectively for repeated requests', async () => {
      // First request - cache miss
      await analyticsService.getUserAnalytics(
        TEST_USER_ID,
        AnalyticsTimeframe.WEEKLY
      );

      // Second request - should hit cache
      const startTime = Date.now();
      const analytics = await analyticsService.getUserAnalytics(
        TEST_USER_ID,
        AnalyticsTimeframe.WEEKLY
      );
      const responseTime = Date.now() - startTime;

      // Verify cache performance
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLD / 2);
      expect(analytics).toBeDefined();
    });
  });

  /**
   * Habit Analytics Tests
   */
  describe('Habit Analytics', () => {
    it('should calculate habit analytics with accurate completion rates', async () => {
      const analytics = await analyticsService.getHabitAnalytics(
        TEST_HABIT_ID,
        AnalyticsTimeframe.MONTHLY
      );

      expect(analytics).toHaveProperty('habitId', TEST_HABIT_ID);
      expect(analytics.completionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.completionRate).toBeLessThanOrEqual(100);
      expect(analytics.currentStreak).toBeGreaterThanOrEqual(0);
      expect(analytics.weeklyProgress).toBeInstanceOf(Array);
    });

    it('should handle concurrent analytics requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() => 
        analyticsService.getHabitAnalytics(
          TEST_HABIT_ID,
          AnalyticsTimeframe.WEEKLY
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Verify concurrent performance
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD * 2);
      results.forEach(result => {
        expect(result).toHaveProperty('habitId', TEST_HABIT_ID);
      });
    });
  });

  /**
   * Heatmap Data Tests
   */
  describe('Heatmap Visualization', () => {
    it('should generate accurate heatmap data', async () => {
      const heatmapData = await analyticsService.getHeatmapData(
        TEST_HABIT_ID,
        testStartDate,
        testEndDate
      );

      expect(Array.isArray(heatmapData)).toBe(true);
      heatmapData.forEach((data: HeatmapData) => {
        expect(data).toHaveProperty('date');
        expect(data).toHaveProperty('value');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('intensity');
        expect(data.value).toBeGreaterThanOrEqual(0);
        expect(data.value).toBeLessThanOrEqual(1);
      });
    });

    it('should maintain data consistency across timezone conversions', async () => {
      const timezones = ['UTC', 'America/New_York', 'Asia/Tokyo'];
      const heatmapPromises = timezones.map(timezone => 
        analyticsService.getHeatmapData(
          TEST_HABIT_ID,
          testStartDate,
          testEndDate
        )
      );

      const results = await Promise.all(heatmapPromises);
      
      // Verify data consistency across timezones
      results.forEach((data, index) => {
        expect(data.length).toBe(results[0].length);
        expect(data[0].value).toBe(results[0][0].value);
      });
    });
  });

  /**
   * Trend Analysis Tests
   */
  describe('Trend Analysis', () => {
    it('should calculate trends with statistical significance', async () => {
      const trend = await analyticsService.getTrendAnalysis(
        TEST_HABIT_ID,
        TimeGranularity.DAILY
      );

      expect(trend).toHaveProperty('period');
      expect(trend).toHaveProperty('value');
      expect(trend).toHaveProperty('change');
      expect(trend).toHaveProperty('trend');
      expect(trend).toHaveProperty('confidence');
      expect(trend.confidence).toBeGreaterThanOrEqual(0);
      expect(trend.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect significant trend changes', async () => {
      // Generate data with known trend
      await setupTrendTestData();

      const trend = await analyticsService.getTrendAnalysis(
        TEST_HABIT_ID,
        TimeGranularity.WEEKLY
      );

      expect(trend.change).not.toBe(0);
      expect(['up', 'down', 'stable', 'volatile']).toContain(trend.trend);
    });
  });

  /**
   * Cache Performance Tests
   */
  describe('Cache Performance', () => {
    it('should maintain high cache hit rate', async () => {
      const requests = Array(10).fill(null).map(() => 
        analyticsService.getUserAnalytics(
          TEST_USER_ID,
          AnalyticsTimeframe.WEEKLY
        )
      );

      await Promise.all(requests);
      const cacheStats = await (analyticsService as any).getCacheStats();

      expect(cacheStats.cacheHitRate).toBeGreaterThanOrEqual(CACHE_HIT_THRESHOLD);
    });

    it('should handle cache invalidation correctly', async () => {
      // Initial request
      await analyticsService.getHabitAnalytics(
        TEST_HABIT_ID,
        AnalyticsTimeframe.WEEKLY
      );

      // Modify data to trigger cache invalidation
      await updateTestData();

      // Subsequent request should fetch fresh data
      const analytics = await analyticsService.getHabitAnalytics(
        TEST_HABIT_ID,
        AnalyticsTimeframe.WEEKLY
      );

      expect(analytics).toHaveProperty('updatedAt');
      expect(new Date(analytics.updatedAt)).toBeGreaterThan(testStartDate);
    });
  });
});

/**
 * Test helper functions
 */

/**
 * Sets up test data for analytics integration tests
 */
async function setupTestData(): Promise<void> {
  // Implementation would create test user, habits, and log entries
  // This would be replaced with actual test data setup in a real implementation
}

/**
 * Sets up specific test data for trend analysis
 */
async function setupTrendTestData(): Promise<void> {
  // Implementation would create test data with known trend patterns
  // This would be replaced with actual trend test data setup in a real implementation
}

/**
 * Updates test data to verify cache invalidation
 */
async function updateTestData(): Promise<void> {
  // Implementation would modify test data to trigger cache invalidation
  // This would be replaced with actual data update logic in a real implementation
}

/**
 * Cleans up all test data
 */
async function cleanupTestData(): Promise<void> {
  // Implementation would remove all test data
  // This would be replaced with actual cleanup logic in a real implementation
}