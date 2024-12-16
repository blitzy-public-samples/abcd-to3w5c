/**
 * @fileoverview Core API constants for frontend-backend communication
 * @version 1.0.0
 * @license MIT
 */

/**
 * Base URL for API endpoints with environment configuration
 * Defaults to localhost for development if not specified
 */
export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';

/**
 * API version identifier for versioning support
 * Current version: v1
 */
export const API_VERSION = 'v1';

/**
 * Request timeout in milliseconds
 * Default: 30 seconds
 */
export const REQUEST_TIMEOUT = 30000;

/**
 * Maximum number of retry attempts for failed requests
 */
export const MAX_RETRIES = 3;

/**
 * Standardized error codes for API responses
 * Following HTTP status code conventions with specific application codes
 */
export enum ErrorCodes {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  RATE_LIMIT = 429,
  SYSTEM_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * HTTP methods used in API calls
 * Readonly object to prevent modification
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
} as const;

/**
 * API endpoint paths for different microservices
 * Organized by service domain
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh'
  },
  HABITS: {
    BASE: '/habits',
    LIST: '/habits',
    CREATE: '/habits',
    UPDATE: '/habits/:id',
    DELETE: '/habits/:id',
    LOGS: '/habits/:id/logs'
  },
  ANALYTICS: {
    BASE: '/analytics',
    SUMMARY: '/analytics/summary',
    TRENDS: '/analytics/trends',
    STREAKS: '/analytics/streaks'
  }
} as const;

/**
 * Rate limits per minute for different API endpoints
 * Based on the technical specification requirements
 */
export const RATE_LIMITS = {
  HABITS_LIST: 100,    // 100 requests per minute
  HABITS_CREATE: 60,   // 60 requests per minute
  HABITS_UPDATE: 60,   // 60 requests per minute
  HABITS_LOG: 120,     // 120 requests per minute
  ANALYTICS: 30        // 30 requests per minute
} as const;

/**
 * Helper function to build full API URL
 * @param endpoint - API endpoint path
 * @returns Full API URL with base URL and version
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}/api/${API_VERSION}${endpoint}`;
};

/**
 * Default headers for API requests
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
} as const;

/**
 * Request configurations
 */
export const REQUEST_CONFIG = {
  timeout: REQUEST_TIMEOUT,
  retries: MAX_RETRIES,
  headers: DEFAULT_HEADERS
} as const;