/**
 * @fileoverview API client configuration with enhanced security, monitoring, and error handling
 * @version 1.0.0
 * @license MIT
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // v1.x
import {
  API_BASE_URL,
  API_VERSION,
  API_ENDPOINTS,
  ErrorCodes,
  DEFAULT_HEADERS,
  REQUEST_CONFIG,
  RATE_LIMITS
} from '../constants/api.constants';
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  isApiError
} from '../types/api.types';

// Global configuration constants
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MONITORING_ENABLED = process.env.NODE_ENV === 'production';

/**
 * Security headers configuration following best practices
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
} as const;

/**
 * Retry configuration for failed requests
 */
const RETRY_CONFIG = {
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  maxRetries: MAX_RETRIES,
  baseDelay: RETRY_DELAY,
  maxDelay: 5000
} as const;

/**
 * Monitoring configuration
 */
const MONITORING_CONFIG = {
  enabled: MONITORING_ENABLED,
  metrics: ['requestTime', 'errorRate', 'responseSize'] as const,
  sampleRate: 0.1
} as const;

/**
 * Enhanced API configuration object
 */
export const API_CONFIG = {
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  timeout: API_TIMEOUT,
  headers: {
    ...DEFAULT_HEADERS,
    ...SECURITY_HEADERS
  },
  security: {
    rateLimits: RATE_LIMITS,
    retryConfig: RETRY_CONFIG
  }
} as const;

/**
 * Handles API errors with enhanced logging and monitoring
 * @param error - Axios error object
 * @returns Standardized API error response
 */
const handleApiError = (error: AxiosError): ApiError => {
  const errorResponse: ApiError = {
    code: error.response?.status || ErrorCodes.SYSTEM_ERROR,
    message: error.message,
    details: {
      url: error.config?.url,
      method: error.config?.method,
      timestamp: new Date().toISOString()
    }
  };

  if (MONITORING_ENABLED) {
    // Log error metrics
    console.error('[API Error]', {
      ...errorResponse,
      stack: error.stack
    });
  }

  return errorResponse;
};

/**
 * Configures monitoring for the API client
 * @param instance - Axios instance
 */
const setupMonitoring = (instance: AxiosInstance): void => {
  if (!MONITORING_CONFIG.enabled) return;

  instance.interceptors.request.use((config) => {
    config.metadata = { startTime: new Date() };
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const requestDuration = Date.now() - (response.config.metadata?.startTime?.getTime() || 0);
      console.info('[API Metrics]', {
        url: response.config.url,
        method: response.config.method,
        duration: requestDuration,
        size: JSON.stringify(response.data).length
      });
      return response;
    },
    (error) => {
      if (error.config?.metadata?.startTime) {
        const requestDuration = Date.now() - error.config.metadata.startTime.getTime();
        console.error('[API Error Metrics]', {
          url: error.config.url,
          method: error.config.method,
          duration: requestDuration,
          error: error.message
        });
      }
      return Promise.reject(error);
    }
  );
};

/**
 * Creates and configures an Axios instance with enhanced features
 * @returns Configured API client instance
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create(API_CONFIG);

  // Request interceptor for authentication and monitoring
  instance.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and response transformation
  instance.interceptors.response.use(
    (response) => {
      const apiResponse: ApiResponse<unknown> = {
        success: true,
        data: response.data,
        error: null,
        timestamp: new Date()
      };
      return apiResponse;
    },
    async (error: AxiosError) => {
      const apiError = handleApiError(error);
      
      // Implement retry logic for specific status codes
      if (
        RETRY_CONFIG.retryStatusCodes.includes(apiError.code) &&
        (error.config?.retryCount || 0) < RETRY_CONFIG.maxRetries
      ) {
        error.config!.retryCount = (error.config?.retryCount || 0) + 1;
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, error.config!.retryCount),
          RETRY_CONFIG.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return instance(error.config!);
      }

      return Promise.reject({
        success: false,
        data: null,
        error: apiError,
        timestamp: new Date()
      });
    }
  );

  // Setup monitoring if enabled
  setupMonitoring(instance);

  return instance;
};

// Create and export the configured API client instance
export const apiClient = createApiClient();

/**
 * Type helper for making typed API requests
 * @template T - Expected response data type
 */
export const createTypedRequest = <T>() => {
  return {
    get: (url: string, config?: AxiosRequestConfig) => 
      apiClient.get<ApiResponse<T>>(url, config),
    post: (url: string, data?: unknown, config?: AxiosRequestConfig) =>
      apiClient.post<ApiResponse<T>>(url, data, config),
    put: (url: string, data?: unknown, config?: AxiosRequestConfig) =>
      apiClient.put<ApiResponse<T>>(url, data, config),
    delete: (url: string, config?: AxiosRequestConfig) =>
      apiClient.delete<ApiResponse<T>>(url, config),
    patch: (url: string, data?: unknown, config?: AxiosRequestConfig) =>
      apiClient.patch<ApiResponse<T>>(url, data, config)
  };
};