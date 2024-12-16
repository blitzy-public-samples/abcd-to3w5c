/**
 * @fileoverview Core TypeScript interfaces and types for API communication
 * @version 1.0.0
 */

/**
 * Standard API error interface for consistent error handling across the application
 */
export interface ApiError {
  /** Numeric error code from error-codes.ts */
  code: number;
  /** Human-readable error message */
  message: string;
  /** Additional error context and details */
  details?: Record<string, any>;
  /** Error stack trace (only available in development) */
  stack?: string;
}

/**
 * Generic API response wrapper for all API endpoints
 * @template T - The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response payload */
  data: T;
  /** Error information if success is false */
  error: ApiError | null;
  /** Response timestamp */
  timestamp: Date;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Optional field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: SortOrder;
}

/**
 * Paginated response wrapper for list endpoints
 * @template T - The type of items in the paginated response
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Valid HTTP methods for API requests
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Sort order direction type
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Type helper for extracting typed response data
 * Ensures type safety by constraining T to object types
 */
export type ApiResponseData<T extends object> = T extends object ? ApiResponse<T> : never;

/**
 * Default pagination constants
 */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Type guard to check if a response is paginated
 */
export function isPaginatedResponse<T>(
  response: ApiResponse<T> | ApiResponse<PaginatedResponse<T>>
): response is ApiResponse<PaginatedResponse<T>> {
  return (
    response.success &&
    typeof response.data === 'object' &&
    response.data !== null &&
    'items' in response.data &&
    'total' in response.data &&
    'page' in response.data &&
    'pageSize' in response.data &&
    'totalPages' in response.data
  );
}

/**
 * Type guard to check if an object is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ApiError).code === 'number' &&
    typeof (error as ApiError).message === 'string'
  );
}