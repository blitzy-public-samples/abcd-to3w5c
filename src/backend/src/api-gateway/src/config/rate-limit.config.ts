/**
 * @fileoverview Rate limiting configuration for API Gateway
 * Implements distributed rate limiting using Redis for high availability
 * with endpoint-specific rate limiting policies and detailed error handling.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { Options } from 'express-rate-limit'; // v6.x
import { RedisStore } from 'rate-limit-redis'; // v3.x
import Redis, { RedisOptions } from 'ioredis'; // v5.x
import { ErrorCodes } from '../../../shared/constants/error-codes';

/**
 * Rate limit window duration in milliseconds (1 minute)
 */
export const RATE_LIMIT_WINDOW_MS = 60000;

/**
 * Default maximum requests per window
 */
export const DEFAULT_MAX_REQUESTS = 100;

/**
 * Endpoint-specific rate limits (requests per minute)
 */
export const ENDPOINT_LIMITS: Record<string, number> = {
  '/api/v1/habits': 100,      // List/Create habits
  '/api/v1/habits/:id': 60,   // Update/Delete habits
  '/api/v1/habits/:id/logs': 120, // Habit logging
  '/api/v1/analytics': 30     // Analytics queries
};

/**
 * IP addresses exempt from rate limiting
 */
export const WHITELISTED_IPS: string[] = [
  '127.0.0.1', // localhost
  '::1'        // localhost IPv6
];

/**
 * Interface for rate limit configuration options
 */
export interface RateLimitConfig extends Options {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
  store: RedisStore;
  skipFailedRequests: boolean;
  skip: (req: Request) => boolean;
  keyGenerator: (req: Request) => string;
  handler: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Creates rate limit configuration with Redis store and custom options
 * @param maxRequests - Maximum requests allowed per window
 * @param windowMs - Time window in milliseconds
 * @param redisConfig - Redis connection configuration
 * @returns Configured rate limit options
 */
export const createRateLimitConfig = (
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  redisConfig: RedisOptions
): Options => {
  // Initialize Redis client
  const redisClient = new Redis({
    ...redisConfig,
    enableOfflineQueue: false,
    retryStrategy: (times: number) => Math.min(times * 50, 2000)
  });

  // Create Redis store instance
  const store = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'rl:', // Rate limit key prefix
    resetExpiryOnChange: true
  });

  // Configure rate limit options
  return {
    windowMs,
    max: maxRequests,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable legacy X-RateLimit headers
    store,
    skipFailedRequests: false, // Count failed requests against limit
    
    // Custom key generator using IP and endpoint
    keyGenerator: (req: Request): string => {
      const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
      return `${ip}:${req.method}:${req.path}`;
    },

    // Skip rate limiting for whitelisted IPs
    skip: (req: Request): boolean => {
      const clientIp = req.ip || req.socket.remoteAddress || '0.0.0.0';
      return WHITELISTED_IPS.includes(clientIp);
    },

    // Custom error handler with standardized format
    handler: (req: Request, res: Response): void => {
      res.status(429).json({
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later.',
        data: {
          retryAfter: res.get('Retry-After'),
          limit: maxRequests,
          windowMs
        }
      });
    },

    // Optional callback on exceeded limit for monitoring
    onLimitReached: (req: Request): void => {
      console.warn(`Rate limit exceeded for IP ${req.ip} on ${req.path}`);
    }
  };
};

/**
 * Default rate limit configuration for general endpoints
 */
export const defaultRateLimitConfig = createRateLimitConfig(
  DEFAULT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true
  }
);

export default {
  defaultRateLimitConfig,
  createRateLimitConfig,
  ENDPOINT_LIMITS
};