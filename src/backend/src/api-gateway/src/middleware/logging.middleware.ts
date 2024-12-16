/**
 * @fileoverview Express middleware for comprehensive request/response logging with
 * performance monitoring, security tracking, and compliance features.
 * Implements structured logging with correlation IDs and detailed timing breakdowns.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.x
import { v4 as uuidv4 } from 'uuid'; // v9.x
import now from 'performance-now'; // v2.x
import { logger } from '../../../shared/utils/logger.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';

// Headers that should be excluded from logging for security
const EXCLUDED_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'session-id'
];

// Maximum length for logged request/response bodies
const MAX_BODY_LENGTH = 1000;

// Performance thresholds in milliseconds
const PERFORMANCE_THRESHOLDS = {
  warning: 100, // Log warning if request takes longer than 100ms
  error: 200    // Log error if request takes longer than 200ms
};

// Patterns for identifying PII data that should be masked
const PII_PATTERNS = [
  /\d{3}-\d{2}-\d{4}/,  // SSN
  /\d{16}/,             // Credit card numbers
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/  // Email addresses
];

/**
 * Interface for tracking request performance metrics
 */
interface PerformanceMetrics {
  startTime: number;
  startMemory: NodeJS.MemoryUsage;
  endTime?: number;
  endMemory?: NodeJS.MemoryUsage;
  processingTime?: number;
  memoryDelta?: number;
}

/**
 * Masks sensitive data in objects before logging
 * @param data - Object containing potentially sensitive data
 * @returns Object with sensitive data masked
 */
const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  
  // Handle different data types
  if (typeof data !== 'object') {
    // Mask PII patterns in strings
    if (typeof data === 'string') {
      let maskedData = data;
      PII_PATTERNS.forEach(pattern => {
        maskedData = maskedData.replace(pattern, '[REDACTED]');
      });
      return maskedData;
    }
    return data;
  }

  // Clone the object to avoid modifying the original
  const maskedData = Array.isArray(data) ? [...data] : { ...data };

  // Recursively mask sensitive data in object properties
  Object.keys(maskedData).forEach(key => {
    if (EXCLUDED_HEADERS.includes(key.toLowerCase())) {
      maskedData[key] = '[REDACTED]';
    } else if (typeof maskedData[key] === 'object') {
      maskedData[key] = maskSensitiveData(maskedData[key]);
    } else if (typeof maskedData[key] === 'string') {
      maskedData[key] = maskSensitiveData(maskedData[key]);
    }
  });

  return maskedData;
};

/**
 * Tracks and analyzes request performance metrics
 * @param metrics - Performance metrics object
 * @returns Performance analysis report
 */
const trackPerformance = (metrics: PerformanceMetrics) => {
  const {
    startTime,
    startMemory,
    endTime = now(),
    endMemory = process.memoryUsage()
  } = metrics;

  const processingTime = endTime - startTime;
  const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

  // Generate performance report
  const performanceReport = {
    processingTime,
    memoryUsage: {
      delta: memoryDelta,
      final: endMemory.heapUsed
    },
    timestamp: new Date().toISOString()
  };

  // Check for performance threshold violations
  if (processingTime > PERFORMANCE_THRESHOLDS.error) {
    logger.error('Request exceeded error threshold', undefined, performanceReport);
  } else if (processingTime > PERFORMANCE_THRESHOLDS.warning) {
    logger.warn('Request exceeded warning threshold', performanceReport);
  }

  return performanceReport;
};

/**
 * Express middleware for comprehensive request/response logging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique correlation ID for request tracking
  const correlationId = uuidv4();
  req.headers['x-correlation-id'] = correlationId;

  // Initialize performance metrics
  const metrics: PerformanceMetrics = {
    startTime: now(),
    startMemory: process.memoryUsage()
  };

  // Prepare initial request log data
  const requestData = {
    correlationId,
    method: req.method,
    url: req.url,
    headers: maskSensitiveData(req.headers),
    query: maskSensitiveData(req.query),
    body: req.body ? maskSensitiveData(req.body) : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Log initial request details
  logger.info('Incoming request', requestData);

  // Track security-relevant headers
  if (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) {
    logger.security('Proxy headers detected', {
      correlationId,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      }
    });
  }

  // Intercept response to log its details
  const originalSend = res.send;
  res.send = function(body: any): Response {
    // Update performance metrics
    metrics.endTime = now();
    metrics.endMemory = process.memoryUsage();
    
    // Generate performance report
    const performanceReport = trackPerformance(metrics);

    // Prepare response log data
    const responseData = {
      correlationId,
      statusCode: res.statusCode,
      headers: maskSensitiveData(res.getHeaders()),
      body: body ? maskSensitiveData(body).slice(0, MAX_BODY_LENGTH) : undefined,
      performance: performanceReport
    };

    // Log response details with appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error('Server error response', undefined, responseData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error response', responseData);
    } else {
      logger.info('Success response', responseData);
    }

    // Log performance metrics
    logger.performance(
      'Request completed',
      performanceReport.processingTime,
      { correlationId, ...performanceReport }
    );

    return originalSend.call(this, body);
  };

  // Handle errors in logging
  try {
    next();
  } catch (error) {
    logger.error('Logging middleware error', error, {
      correlationId,
      code: ErrorCodes.SYSTEM_ERROR
    });
    next(error);
  }
};

// Export maskSensitiveData for use in other modules
export { maskSensitiveData };