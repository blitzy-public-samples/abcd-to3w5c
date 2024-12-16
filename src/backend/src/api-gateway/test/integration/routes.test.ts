/**
 * @fileoverview Integration tests for API Gateway routes covering authentication,
 * habit management, analytics, security controls, and performance metrics.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'; // v29.0.0
import supertest from 'supertest'; // v6.3.3
import { faker } from '@faker-js/faker'; // v8.0.0
import app from '../../src/app';
import { LoginCredentials } from '../../../../auth-service/src/interfaces/auth.interface';
import { ErrorCodes } from '../../../../shared/constants/error-codes';

const request = supertest(app);

// Test data and configuration
const testUser = {
  email: faker.internet.email(),
  password: 'Test123!@#',
  mfaSecret: '',
  id: ''
};

const testHabit = {
  name: faker.lorem.words(3),
  description: faker.lorem.sentence(),
  frequency: {
    type: 'daily',
    days: ['monday', 'wednesday', 'friday']
  }
};

let authToken: string;
let refreshToken: string;

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  AUTH_RESPONSE_TIME: 200, // ms
  API_RESPONSE_TIME: 200, // ms
  CACHE_HIT_RATIO: 0.95
};

describe('API Gateway Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Cleanup test environment
    await cleanupTestEnvironment();
  });

  describe('Authentication Routes', () => {
    test('should register new user with valid credentials', async () => {
      const response = await request
        .post('/api/v1/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should fail registration with invalid password format', async () => {
      const response = await request
        .post('/api/v1/auth/register')
        .send({
          email: faker.internet.email(),
          password: 'weak',
          confirmPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    test('should login user with valid credentials and MFA', async () => {
      const credentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
        mfaToken: generateTestMFAToken(testUser.mfaSecret)
      };

      const startTime = Date.now();
      const response = await request
        .post('/api/v1/auth/login')
        .send(credentials);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUTH_RESPONSE_TIME);

      authToken = response.body.data.accessToken;
      refreshToken = response.headers['set-cookie'][0];
    });

    test('should enforce rate limiting on login attempts', async () => {
      const attempts = Array(11).fill(null).map(() => 
        request
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'wrong-password'
          })
      );

      const responses = await Promise.all(attempts);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Habit Management Routes', () => {
    test('should create new habit with valid data', async () => {
      const startTime = Date.now();
      const response = await request
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testHabit);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: testHabit.name,
        frequency: testHabit.frequency
      });
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);

      testHabit.id = response.body.data.id;
    });

    test('should retrieve habits list with caching', async () => {
      // First request - cache miss
      const firstResponse = await request
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.headers['cache-control']).toBeDefined();

      // Second request - cache hit
      const startTime = Date.now();
      const secondResponse = await request
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`);
      const responseTime = Date.now() - startTime;

      expect(secondResponse.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME / 2);
    });

    test('should update habit with valid data', async () => {
      const updatedName = faker.lorem.words(3);
      const response = await request
        .put(`/api/v1/habits/${testHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: updatedName });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(updatedName);
    });

    test('should mark habit as completed', async () => {
      const response = await request
        .post(`/api/v1/habits/${testHabit.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('completedAt');
    });
  });

  describe('Analytics Routes', () => {
    test('should retrieve habit analytics with caching', async () => {
      const firstResponse = await request
        .get(`/api/v1/analytics/habits/${testHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.headers['cache-control']).toContain('max-age=300');

      const startTime = Date.now();
      const secondResponse = await request
        .get(`/api/v1/analytics/habits/${testHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      const responseTime = Date.now() - startTime;

      expect(secondResponse.status).toBe(200);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME / 2);
    });

    test('should retrieve user analytics with proper authorization', async () => {
      const response = await request
        .get('/api/v1/analytics/user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalHabits');
      expect(response.body.data).toHaveProperty('completionRate');
    });

    test('should export analytics data in requested format', async () => {
      const response = await request
        .post('/api/v1/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          timeframe: 'monthly',
          includeRawData: true
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Security Controls', () => {
    test('should enforce security headers on all responses', async () => {
      const response = await request
        .get('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should handle invalid JWT tokens appropriately', async () => {
      const response = await request
        .get('/api/v1/habits')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe(ErrorCodes.AUTHENTICATION_ERROR);
    });

    test('should prevent CSRF attacks', async () => {
      const response = await request
        .post('/api/v1/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'https://malicious-site.com')
        .send(testHabit);

      expect(response.status).toBe(403);
    });
  });
});

// Helper functions
async function setupTestEnvironment(): Promise<void> {
  // Initialize test database
  // Setup test user accounts
  // Configure test rate limiting
  // Setup test cache instance
}

async function cleanupTestEnvironment(): Promise<void> {
  // Clean up test data
  // Clear test cache
  // Reset rate limiting
}

function generateTestMFAToken(secret: string): string {
  // Generate test MFA token
  return 'test-mfa-token';
}