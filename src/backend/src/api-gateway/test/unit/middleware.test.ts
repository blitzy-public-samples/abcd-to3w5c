/**
 * @fileoverview Comprehensive unit test suite for API Gateway middleware components
 * including authentication, error handling, request validation, and logging middleware.
 * 
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0.0
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { sign } from 'jsonwebtoken'; // v9.0.0
import supertest from 'supertest'; // v6.3.3
import { 
  authenticateToken, 
  authorizeRoles 
} from '../../src/middleware/auth.middleware';
import { errorHandler } from '../../src/middleware/error.middleware';
import { validate } from '../../src/middleware/validation.middleware';
import { requestLogger, maskSensitiveData } from '../../src/middleware/logging.middleware';
import { AppError } from '../../../shared/interfaces/error.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorMessages } from '../../../shared/constants/messages';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ALGORITHM = 'HS256';

// Mock request, response and next function
let mockRequest: Partial<Request>;
let mockResponse: Partial<Response>;
let mockNext: NextFunction;

beforeEach(() => {
  mockRequest = {
    headers: {},
    body: {},
    ip: '127.0.0.1',
    path: '/test',
    method: 'GET',
    get: jest.fn()
  };
  mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({})
  };
  mockNext = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Authentication Middleware Tests', () => {
  const generateValidToken = (payload = { userId: '123', email: 'test@example.com', roles: ['USER'] }) => {
    return sign(payload, process.env.JWT_SECRET!, { algorithm: 'HS256' });
  };

  test('should authenticate valid JWT token', async () => {
    const token = generateValidToken();
    mockRequest.headers = { authorization: `Bearer ${token}` };

    await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.userId).toBe('123');
  });

  test('should reject missing token', async () => {
    await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.any(AppError)
    );
    expect(mockNext.mock.calls[0][0].code).toBe(ErrorCodes.AUTHENTICATION_ERROR);
  });

  test('should reject expired token', async () => {
    const token = sign(
      { userId: '123', email: 'test@example.com', roles: ['USER'] },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' }
    );
    mockRequest.headers = { authorization: `Bearer ${token}` };

    await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.any(AppError)
    );
  });

  test('should handle role-based authorization', async () => {
    const token = generateValidToken({ userId: '123', email: 'test@example.com', roles: ['ADMIN'] });
    mockRequest.headers = { authorization: `Bearer ${token}` };
    mockRequest.user = { userId: '123', email: 'test@example.com', roles: ['ADMIN'] };

    const adminMiddleware = authorizeRoles(['ADMIN']);
    adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });
});

describe('Error Handler Middleware Tests', () => {
  test('should handle AppError instances', () => {
    const error = new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      { field: 'email' }
    );

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCodes.VALIDATION_ERROR
      })
    );
  });

  test('should handle system errors', () => {
    const error = new Error('System error');

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCodes.SYSTEM_ERROR
      })
    );
  });

  test('should mask sensitive data in error responses', () => {
    const error = new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      { password: 'secret123', email: 'test@example.com' }
    );

    errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(responseData.details.password).toBeUndefined();
  });
});

describe('Validation Middleware Tests', () => {
  class TestDTO {
    email!: string;
    password!: string;
  }

  test('should validate correct input', async () => {
    mockRequest.body = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    const validateMiddleware = validate(TestDTO);
    await validateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  test('should reject invalid input', async () => {
    mockRequest.body = {
      email: 'invalid-email',
      password: '123'
    };

    const validateMiddleware = validate(TestDTO);
    await validateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCodes.VALIDATION_ERROR
      })
    );
  });

  test('should handle validation timeouts', async () => {
    mockRequest.body = { email: 'test@example.com' };

    const validateMiddleware = validate(TestDTO, { validationTimeout: 1 });
    await validateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.any(Error)
    );
  });
});

describe('Logging Middleware Tests', () => {
  test('should log request details', () => {
    mockRequest.method = 'POST';
    mockRequest.path = '/api/habits';
    mockRequest.body = { name: 'Test Habit' };
    mockRequest.headers = {
      'user-agent': 'test-agent',
      'authorization': 'Bearer token123'
    };

    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.headers['x-correlation-id']).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
  });

  test('should mask sensitive data', () => {
    const sensitiveData = {
      password: 'secret123',
      email: 'test@example.com',
      creditCard: '4111111111111111',
      ssn: '123-45-6789'
    };

    const maskedData = maskSensitiveData(sensitiveData);

    expect(maskedData.password).toBe('[REDACTED]');
    expect(maskedData.creditCard).toBe('[REDACTED]');
    expect(maskedData.ssn).toBe('[REDACTED]');
  });

  test('should track request performance', () => {
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    const response = mockResponse.send?.call(mockResponse, { data: 'test' });
    
    expect(response).toBeDefined();
    // Performance metrics should be logged
  });
});