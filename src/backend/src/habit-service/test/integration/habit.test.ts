/**
 * @fileoverview Integration tests for the habit service endpoints and functionality.
 * Tests complete request-response cycle, data persistence, caching, performance metrics,
 * and security controls.
 * 
 * @version 1.0.0
 */

import request from 'supertest'; // v6.3.3
import { performance } from 'perf_hooks';
import Redis from 'ioredis'; // v4.0.0
import { app } from '../../src/app';
import { Habit } from '../../src/interfaces/habit.interface';
import { prisma } from '../../src/config/database.config';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { SuccessMessages } from '../../../shared/constants/messages';

// Test constants
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  token: 'test-auth-token'
};

const TEST_HABIT = {
  name: 'Morning Meditation',
  description: 'Daily morning meditation practice',
  frequency: {
    type: 'DAILY',
    value: 1,
    days: [1, 2, 3, 4, 5],
    customSchedule: null
  },
  reminderTime: new Date('2024-01-01T08:00:00Z')
};

const PERFORMANCE_THRESHOLDS = {
  apiResponse: 100, // ms
  databaseQuery: 10, // ms
  cacheOperation: 5 // ms
};

describe('Habit Service Integration Tests', () => {
  let redisClient: Redis;

  beforeAll(async () => {
    // Initialize Redis client
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    // Clear test data
    await prisma.habit.deleteMany({
      where: { userId: TEST_USER.id }
    });
    await redisClient.flushall();

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = TEST_USER;
      next();
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.habit.deleteMany({
      where: { userId: TEST_USER.id }
    });
    await redisClient.flushall();
    await redisClient.quit();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/habits', () => {
    it('should create a new habit with proper validation and caching', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .send(TEST_HABIT);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Verify response time
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);

      // Verify response structure
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(SuccessMessages.HABIT_CREATED);
      expect(response.body.data).toMatchObject({
        name: TEST_HABIT.name,
        description: TEST_HABIT.description,
        userId: TEST_USER.id
      });

      // Verify database persistence
      const habit = await prisma.habit.findUnique({
        where: { id: response.body.data.id }
      });
      expect(habit).toBeTruthy();

      // Verify cache invalidation
      const cacheKey = `habit-service:user-habits:${TEST_USER.id}`;
      const cached = await redisClient.get(cacheKey);
      expect(cached).toBeNull();

      // Verify security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should enforce validation rules and return appropriate errors', async () => {
      const invalidHabit = {
        ...TEST_HABIT,
        name: '', // Invalid: empty name
        frequency: {
          type: 'INVALID', // Invalid frequency type
          value: 0, // Invalid value
          days: [8], // Invalid day
          customSchedule: null
        }
      };

      const response = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .send(invalidHabit);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(response.body.errors).toContain('Name is required');
    });

    it('should enforce habit limit per user', async () => {
      // Create maximum allowed habits
      const maxHabits = 50;
      const createHabits = Array(maxHabits).fill(null).map((_, i) => ({
        ...TEST_HABIT,
        name: `Test Habit ${i}`
      }));

      for (const habit of createHabits) {
        await request(app)
          .post('/api/v1/habits')
          .set('Authorization', `Bearer ${TEST_USER.token}`)
          .send(habit);
      }

      // Attempt to create one more habit
      const response = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .send(TEST_HABIT);

      expect(response.status).toBe(422);
      expect(response.body.code).toBe(ErrorCodes.HABIT_LIMIT_EXCEEDED);
    });
  });

  describe('GET /api/v1/habits', () => {
    it('should return habits with proper caching and pagination', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .query({ page: 1, limit: 10 });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Verify response time
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);

      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);

      // Verify cache creation
      const cacheKey = `habit-service:user-habits:${TEST_USER.id}`;
      const cached = await redisClient.get(cacheKey);
      expect(cached).toBeTruthy();

      // Verify subsequent request uses cache
      const cachedResponse = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .query({ page: 1, limit: 10 });

      expect(cachedResponse.body).toEqual(response.body);
    });

    it('should properly handle filtering and sorting', async () => {
      const response = await request(app)
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .query({
          frequency: 'DAILY',
          sort: 'createdAt:desc'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.every((h: Habit) => h.frequency.type === 'DAILY')).toBe(true);
      
      // Verify sorting
      const dates = response.body.data.map((h: Habit) => new Date(h.createdAt));
      expect(dates).toEqual([...dates].sort((a, b) => b.getTime() - a.getTime()));
    });
  });

  describe('PUT /api/v1/habits/:id', () => {
    let testHabitId: string;

    beforeEach(async () => {
      // Create a test habit
      const createResponse = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .send(TEST_HABIT);
      testHabitId = createResponse.body.data.id;
    });

    it('should update habit with proper validation and cache invalidation', async () => {
      const updateData = {
        name: 'Updated Meditation',
        description: 'Updated description'
      };

      const startTime = performance.now();

      const response = await request(app)
        .put(`/api/v1/habits/${testHabitId}`)
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .send(updateData);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Verify response time
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);

      // Verify cache invalidation
      const cacheKey = `habit-service:habit:${testHabitId}`;
      const cached = await redisClient.get(cacheKey);
      expect(cached).toBeNull();
    });
  });

  describe('DELETE /api/v1/habits/:id', () => {
    let testHabitId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${TEST_USER.token}`)
        .send(TEST_HABIT);
      testHabitId = createResponse.body.data.id;
    });

    it('should delete habit and invalidate cache', async () => {
      const response = await request(app)
        .delete(`/api/v1/habits/${testHabitId}`)
        .set('Authorization', `Bearer ${TEST_USER.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify database deletion
      const habit = await prisma.habit.findUnique({
        where: { id: testHabitId }
      });
      expect(habit).toBeNull();

      // Verify cache invalidation
      const cacheKey = `habit-service:habit:${testHabitId}`;
      const cached = await redisClient.get(cacheKey);
      expect(cached).toBeNull();
    });
  });
});