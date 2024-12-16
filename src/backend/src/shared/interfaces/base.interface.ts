/**
 * @fileoverview Defines fundamental base interfaces and types used across all microservices
 * in the habit tracking application. Provides common type definitions for database entities,
 * API responses, and service operations with strict type safety.
 * 
 * @version 1.0.0
 */

/**
 * Type alias for UUID strings ensuring consistent ID handling across the application.
 * Follows RFC 4122 UUID v4 format.
 * Example: "123e4567-e89b-12d3-a456-426614174000"
 */
export type UUID = string;

/**
 * Type alias for timestamp fields with proper date handling.
 * All timestamps should be in ISO 8601 format.
 * Example: "2023-11-14T12:00:00.000Z"
 */
export type Timestamp = Date;

/**
 * Base interface for all database entities with common fields and strict readonly properties.
 * Provides audit fields for tracking entity creation and updates.
 */
export interface BaseEntity {
  /** Unique identifier for the entity - immutable after creation */
  readonly id: UUID;
  
  /** Timestamp when the entity was created - immutable */
  readonly createdAt: Timestamp;
  
  /** Timestamp when the entity was last updated - automatically managed */
  updatedAt: Timestamp;
}

/**
 * Base interface for all API responses with standardized structure.
 * Ensures consistent response format across all endpoints.
 */
export interface BaseResponse {
  /** Indicates if the operation was successful */
  readonly success: boolean;
  
  /** Timestamp when the response was generated */
  readonly timestamp: Timestamp;
  
  /** Human-readable message describing the response status */
  readonly message: string;
}

/**
 * Generic interface for paginated API responses with type constraints.
 * Ensures type safety when working with collections of entities.
 * 
 * @template T - Type of entities in the response, must extend BaseEntity
 */
export interface PaginatedResponse<T extends BaseEntity> {
  /** Array of entities for the current page */
  readonly data: T[];
  
  /** Total number of entities matching the query */
  readonly total: number;
  
  /** Current page number (1-based) */
  readonly page: number;
  
  /** Maximum number of items per page */
  readonly limit: number;
  
  /** Indicates if there are more pages available */
  readonly hasMore: boolean;
}