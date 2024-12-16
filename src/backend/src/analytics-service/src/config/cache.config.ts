/**
 * Redis Cache Configuration for Analytics Service
 * Version: 1.0.0
 * 
 * This module provides type-safe Redis configuration for the analytics service
 * with optimized settings for performance and reliability.
 * 
 * Dependencies:
 * - ioredis@5.3.0: Type-safe Redis client for Node.js
 */

import { RedisOptions } from 'ioredis';

/**
 * Interface defining Redis connection parameters with strict typing
 */
interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryStrategy: (times: number) => number | void;
  connectTimeout: number;
}

/**
 * Interface defining Redis cache behavior options for optimal performance
 */
interface RedisCacheOptions {
  ttl: number;
  prefix: string;
  maxMemory: string;
  maxMemoryPolicy: string;
  keyPrefix: string;
  enableOfflineQueue: boolean;
  reconnectOnError: (error: Error) => boolean | void;
}

/**
 * Cache configuration constants
 */
const DEFAULT_CACHE_TTL = 300; // 5 minutes in seconds
const CACHE_KEY_PREFIX = 'analytics:';
const MAX_MEMORY_POLICY = 'allkeys-lru';
const CONNECT_TIMEOUT = 5000; // 5 seconds in milliseconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second in milliseconds

/**
 * Creates a retry strategy for Redis connection attempts using exponential backoff
 * @param times - Number of retry attempts
 * @returns Delay in milliseconds or void to stop retrying
 */
const createRetryStrategy = (times: number): number | void => {
  if (times > MAX_RETRY_ATTEMPTS) {
    // Stop retrying after maximum attempts
    return undefined;
  }
  
  // Exponential backoff with jitter
  const delay = Math.min(
    RETRY_DELAY * Math.pow(2, times - 1) + Math.random() * 100,
    10000
  );
  
  return delay;
};

/**
 * Get Redis configuration based on environment with retry and error handling
 */
const getRedisConfig = (): RedisConnectionConfig => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    connectTimeout: CONNECT_TIMEOUT,
    retryStrategy: createRetryStrategy,
  };
};

/**
 * Comprehensive Redis cache configuration object
 */
export const cacheConfig = {
  connection: getRedisConfig(),
  options: {
    ttl: DEFAULT_CACHE_TTL,
    prefix: CACHE_KEY_PREFIX,
    maxMemory: '512mb',
    maxMemoryPolicy: MAX_MEMORY_POLICY,
    keyPrefix: CACHE_KEY_PREFIX,
    enableOfflineQueue: true,
    reconnectOnError: (error: Error): boolean => {
      // Attempt reconnection on READONLY errors (common in failover scenarios)
      return error.message.includes('READONLY');
    },
  } as RedisCacheOptions,
} as const;

/**
 * Type assertion to ensure configuration matches Redis options
 */
const _typeCheck: RedisOptions = cacheConfig.connection;

export type { RedisConnectionConfig, RedisCacheOptions };