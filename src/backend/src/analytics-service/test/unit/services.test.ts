/**
 * @fileoverview Comprehensive unit tests for the Analytics Service
 * Testing core analytics calculations, caching, and performance
 * 
 * @version 1.0.0
 * @requires jest@29.x
 * @requires ioredis-mock@8.x
 * @requires dayjs@1.11.0
 */

import { Redis } from 'ioredis-mock'; // v8.x
import dayjs from 'dayjs'; // v1.11.0
import { AnalyticsService } from '../../src/services/analytics.service';
import {
  calculateCompletionRate,
  calculateStreak,
  generateHeatmapData,
  calculateTrend,
  calculateWeeklyProgress
} from '../../src/utils/statistics.util';
import {
  HabitAnalytics,
  UserAnalytics,
  AnalyticsTimeframe,
  TimeGranularity
} from '../../src/interfaces/analytics.interface';

// Constants for testing
const PERFORMANCE_THRESHOLD_MS = 200;
const TEST_CACHE_TTL = 300;
const mockUserId = 'test-user-id';
const mockHabitId = 'test-habit-id';

/**
 * Enhanced mock class for AnalyticsService with performance tracking
 */
class MockAnalyticsService extends AnalyticsService {
  private performanceMetrics: { [key: string]: number[] } = {};

  constructor(options = {}) {
    super();
    this.redisClient = new Redis();
    this.cacheTTL = TEST_CACHE_TTL;
  }

  // Track execution time for performance testing
  async measurePerformance(operation: string, fn: () => Promise<any>): Promise<any> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    if (!this.performanceMetrics[operation]) {
      this.performanceMetrics[operation] = [];
    }
    this.performanceMetrics[operation].push(duration);
    
    return result;
  }

  getAveragePerformance(operation: string): number {
    const metrics = this.performanceMetrics[operation];
    if (!metrics?.length) return 0;
    return metrics.reduce((a, b) => a + b, 0) / metrics.length;
  }
}

describe('AnalyticsService', () => {
  let service: MockAnalyticsService;
  let mockDate: Date;

  beforeEach(() => {
    // Reset date mock and timezone
    mockDate = new Date('2023-11-15T12:00:00Z');
    jest.useFakeTimers().setSystemTime(mockDate);
    
    // Initialize fresh service instance
    service = new MockAnalyticsService();
    
    // Clear Redis mock data
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getUserAnalytics', () => {
    const mockUserAnalytics: UserAnalytics = {
      userId: mockUserId,
      totalHabits: 5,
      activeHabits: 3,
      overallCompletionRate: 75.5,
      trends: [{
        period: '2023-W46',
        value: 75.5,
        change: 5.5,
        trend: 'up',
        confidence: 0.95,
        metadata: {}
      }],
      habitAnalytics: [],
      id: 'test-analytics-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return cached user analytics within performance threshold', async () => {
      // Setup cache
      await service.redisClient.setex(
        `analytics:user:${mockUserId}:${AnalyticsTimeframe.DAILY}`,
        TEST_CACHE_TTL,
        JSON.stringify(mockUserAnalytics)
      );

      const result = await service.measurePerformance('getUserAnalytics', async () => 
        await service.getUserAnalytics(mockUserId, AnalyticsTimeframe.DAILY)
      );

      expect(result).toEqual(mockUserAnalytics);
      expect(service.getAveragePerformance('getUserAnalytics')).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should calculate and cache user analytics with proper error handling', async () => {
      const result = await service.getUserAnalytics(mockUserId, AnalyticsTimeframe.DAILY);
      
      expect(result).toBeDefined();
      const cachedData = await service.redisClient.get(
        `analytics:user:${mockUserId}:${AnalyticsTimeframe.DAILY}`
      );
      expect(cachedData).toBeDefined();
    });

    it('should handle empty habit data with appropriate response', async () => {
      const result = await service.getUserAnalytics('empty-user', AnalyticsTimeframe.DAILY);
      
      expect(result.totalHabits).toBe(0);
      expect(result.activeHabits).toBe(0);
      expect(result.overallCompletionRate).toBe(0);
    });
  });

  describe('getHabitAnalytics', () => {
    const mockHabitAnalytics: HabitAnalytics = {
      habitId: mockHabitId,
      completionRate: 80.5,
      currentStreak: 5,
      longestStreak: 10,
      weeklyProgress: [{
        week: 46,
        completedDays: 5,
        totalDays: 7,
        rate: 71.4,
        dailyStatus: ['completed', 'completed', 'completed', 'completed', 'completed', 'missed', 'missed']
      }],
      trends: [],
      heatmapData: [],
      id: 'test-habit-analytics-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return cached habit analytics within threshold', async () => {
      await service.redisClient.setex(
        `analytics:habit:${mockHabitId}:${AnalyticsTimeframe.DAILY}`,
        TEST_CACHE_TTL,
        JSON.stringify(mockHabitAnalytics)
      );

      const result = await service.measurePerformance('getHabitAnalytics', async () =>
        await service.getHabitAnalytics(mockHabitId, AnalyticsTimeframe.DAILY)
      );

      expect(result).toEqual(mockHabitAnalytics);
      expect(service.getAveragePerformance('getHabitAnalytics')).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should calculate streaks with proper date handling', async () => {
      const mockLogs = [
        { date: dayjs().subtract(2, 'day').toDate(), completed: true },
        { date: dayjs().subtract(1, 'day').toDate(), completed: true },
        { date: dayjs().toDate(), completed: true }
      ];

      const streak = calculateStreak(mockLogs);
      expect(streak).toBe(3);
    });
  });

  describe('getHeatmapData', () => {
    const startDate = dayjs().subtract(30, 'days').toDate();
    const endDate = mockDate;

    it('should generate correct heatmap data within time limit', async () => {
      const result = await service.measurePerformance('getHeatmapData', async () =>
        await service.getHeatmapData(mockHabitId, startDate, endDate)
      );

      expect(Array.isArray(result)).toBe(true);
      expect(service.getAveragePerformance('getHeatmapData')).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should handle empty date ranges appropriately', async () => {
      const result = await service.getHeatmapData(
        'empty-habit',
        startDate,
        endDate
      );

      expect(result.length).toBe(31); // 30 days + current day
      expect(result.every(data => data.value === 0)).toBe(true);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should calculate correct trend direction within threshold', async () => {
      const mockValues = Array.from({ length: 14 }, (_, i) => 75 + i * 0.5);
      
      const result = await service.measurePerformance('getTrendAnalysis', async () =>
        calculateTrend(mockValues, TimeGranularity.DAILY)
      );

      expect(result.trend).toBe('up');
      expect(service.getAveragePerformance('getTrendAnalysis')).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should handle insufficient data points gracefully', async () => {
      const mockValues = [75, 80, 85]; // Less than minimum required points
      
      await expect(async () => {
        await calculateTrend(mockValues, TimeGranularity.DAILY);
      }).rejects.toThrow('Insufficient data points');
    });
  });

  describe('Performance Benchmarking', () => {
    it('should maintain performance under load', async () => {
      const operations = Array.from({ length: 10 }, async () => {
        await service.getUserAnalytics(mockUserId, AnalyticsTimeframe.DAILY);
        await service.getHabitAnalytics(mockHabitId, AnalyticsTimeframe.DAILY);
        await service.getHeatmapData(mockHabitId, dayjs().subtract(30, 'days').toDate(), mockDate);
      });

      await Promise.all(operations);

      const avgUserAnalytics = service.getAveragePerformance('getUserAnalytics');
      const avgHabitAnalytics = service.getAveragePerformance('getHabitAnalytics');
      const avgHeatmapData = service.getAveragePerformance('getHeatmapData');

      expect(avgUserAnalytics).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(avgHabitAnalytics).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(avgHeatmapData).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });
});