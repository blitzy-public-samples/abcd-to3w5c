/**
 * @fileoverview Integration tests for authentication service covering complete auth flows,
 * security validations, and compliance requirements including Auth0 integration,
 * OAuth flows, MFA validation, and security standards verification.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.0
import { GenericContainer, StartedTestContainer } from 'testcontainers'; // ^8.0.0
import { WebAuth } from 'auth0-js'; // ^9.19.0
import { AuthService } from '../../src/services/auth.service';
import { AuthProvider, TokenType } from '../../src/interfaces/auth.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorMessages } from '../../../shared/constants/messages';

// Test constants
const TEST_USERS = {
  standard: {
    email: 'test@example.com',
    password: 'Test123!',
    auth0Id: 'auth0|123456789'
  },
  mfa: {
    email: 'mfa@example.com',
    password: 'Test123!',
    auth0Id: 'auth0|987654321',
    totpSecret: 'BASE32SECRET'
  },
  oauth: {
    provider: AuthProvider.GOOGLE,
    mockToken: 'mock_oauth_token',
    email: 'oauth@example.com'
  }
};

const TEST_TIMEOUTS = {
  auth: 5000,
  mfa: 3000,
  oauth: 10000
};

const SECURITY_CONFIGS = {
  rateLimit: {
    window: 60000,
    max: 100
  },
  jwt: {
    algorithm: 'RS256',
    expiresIn: '1h'
  }
};

describe('Authentication Service Integration Tests', () => {
  let authService: AuthService;
  let redisContainer: StartedTestContainer;
  let auth0Mock: WebAuth;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    // Start Redis container for session/cache testing
    redisContainer = await new GenericContainer('redis:6-alpine')
      .withExposedPorts(6379)
      .start();

    // Configure test environment
    process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
    process.env.AUTH0_DOMAIN = 'test.auth0.com';
    process.env.AUTH0_CLIENT_ID = 'test-client-id';
    process.env.AUTH0_CLIENT_SECRET = 'test-client-secret';
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Initialize Auth0 mock
    auth0Mock = new WebAuth({
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENT_ID
    });

    // Initialize auth service
    authService = new AuthService();
    
    // Initialize supertest instance
    request = supertest(process.env.API_URL);
  });

  afterAll(async () => {
    await redisContainer.stop();
  });

  describe('Standard Authentication Flow', () => {
    test('should successfully authenticate with valid credentials', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.standard.email,
          password: TEST_USERS.standard.password,
          provider: AuthProvider.EMAIL
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        token: {
          tokenType: TokenType.ACCESS,
          expiresIn: expect.any(Number)
        },
        user: {
          email: TEST_USERS.standard.email,
          auth0Id: TEST_USERS.standard.auth0Id
        }
      });

      // Verify token structure and claims
      expect(response.body.token.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    test('should fail authentication with invalid credentials', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.standard.email,
          password: 'wrong_password',
          provider: AuthProvider.EMAIL
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: ErrorMessages.INVALID_CREDENTIALS
      });
    });

    test('should enforce rate limiting on failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request
          .post('/api/v1/auth/login')
          .send({
            email: TEST_USERS.standard.email,
            password: 'wrong_password',
            provider: AuthProvider.EMAIL
          });
      }

      // Verify rate limit is enforced
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.standard.email,
          password: TEST_USERS.standard.password,
          provider: AuthProvider.EMAIL
        })
        .expect(429);

      expect(response.body.message).toContain('Too many login attempts');
    });
  });

  describe('MFA Authentication Flow', () => {
    test('should require MFA token when enabled', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.mfa.email,
          password: TEST_USERS.mfa.password,
          provider: AuthProvider.EMAIL
        })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        code: ErrorCodes.AUTHENTICATION_ERROR,
        details: { requiresMfa: true }
      });
    });

    test('should authenticate successfully with valid MFA token', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.mfa.email,
          password: TEST_USERS.mfa.password,
          provider: AuthProvider.EMAIL,
          mfaToken: '123456' // Mock valid TOTP token
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('OAuth Authentication Flow', () => {
    test('should handle successful OAuth authentication', async () => {
      const response = await request
        .post('/api/v1/auth/oauth/callback')
        .send({
          provider: AuthProvider.GOOGLE,
          code: TEST_USERS.oauth.mockToken
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        token: expect.any(Object),
        user: {
          email: TEST_USERS.oauth.email,
          provider: AuthProvider.GOOGLE
        }
      });
    });
  });

  describe('Token Management', () => {
    let validToken: string;

    beforeAll(async () => {
      // Get valid token for tests
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.standard.email,
          password: TEST_USERS.standard.password,
          provider: AuthProvider.EMAIL
        });
      validToken = response.body.token.accessToken;
    });

    test('should validate valid tokens', async () => {
      const response = await request
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    test('should reject expired tokens', async () => {
      // Mock expired token
      const expiredToken = 'expired.token.signature';
      
      const response = await request
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        code: ErrorCodes.TOKEN_EXPIRED
      });
    });

    test('should successfully refresh valid tokens', async () => {
      const response = await request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: validToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        token: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });
    });
  });

  describe('Security Headers and Standards', () => {
    test('should include required security headers', async () => {
      const response = await request
        .get('/api/v1/auth/status')
        .expect(200);

      expect(response.headers).toMatchObject({
        'strict-transport-security': expect.any(String),
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'content-security-policy': expect.any(String)
      });
    });

    test('should enforce secure cookie attributes', async () => {
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USERS.standard.email,
          password: TEST_USERS.standard.password,
          provider: AuthProvider.EMAIL
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/Secure/);
      expect(cookies[0]).toMatch(/HttpOnly/);
      expect(cookies[0]).toMatch(/SameSite=Strict/);
    });
  });
});