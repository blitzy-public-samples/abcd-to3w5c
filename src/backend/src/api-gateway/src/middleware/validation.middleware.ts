/**
 * @fileoverview Express middleware providing comprehensive request validation functionality
 * for the API Gateway. Implements strict validation, sanitization, and performance monitoring
 * to ensure data integrity and security across all API endpoints.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { plainToClass } from 'class-transformer'; // v0.5.1
import { validate, ValidationError as ClassValidatorError } from 'class-validator'; // v0.14.0
import { sanitize } from 'class-sanitizer'; // v1.0.1
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ValidationError } from '../../../shared/interfaces/error.interface';
import { createErrorResponse } from '../../../shared/utils/response.util';

/**
 * Interface defining comprehensive options for validation middleware configuration
 */
export interface ValidationOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  strictValidation?: boolean;
  sanitize?: boolean;
  maxBodySize?: number;
  validationTimeout?: number;
  enableCache?: boolean;
}

/**
 * Type definition for validation middleware function
 */
type ValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  skipMissingProperties: false,
  whitelist: true,
  forbidNonWhitelisted: true,
  strictValidation: true,
  sanitize: true,
  maxBodySize: 10 * 1024 * 1024, // 10MB
  validationTimeout: 5000, // 5 seconds
  enableCache: true,
};

// Validation cache using WeakMap for memory-efficient caching
const validationCache = new WeakMap<object, boolean>();

/**
 * Creates a validation middleware with comprehensive validation, sanitization,
 * and monitoring capabilities.
 * 
 * @param ClassType - The class type to validate against
 * @param options - Validation options
 * @returns Express middleware function that validates requests
 */
export function validate<T extends object>(
  ClassType: new () => T,
  options: ValidationOptions = {}
): ValidationMiddleware {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate content type and body size
      if (!req.is('application/json')) {
        throw new Error('Content-Type must be application/json');
      }

      if (req.body && Buffer.byteLength(JSON.stringify(req.body)) > mergedOptions.maxBodySize!) {
        throw new Error(`Request body exceeds maximum size of ${mergedOptions.maxBodySize} bytes`);
      }

      // Start validation timing
      const validationStart = process.hrtime();

      // Check validation cache if enabled
      if (mergedOptions.enableCache && validationCache.has(req.body)) {
        return next();
      }

      // Sanitize input if enabled
      if (mergedOptions.sanitize) {
        sanitize(req.body);
      }

      // Transform plain object to class instance
      const classInstance = plainToClass(ClassType, req.body);

      // Apply strict validation if enabled
      if (mergedOptions.strictValidation) {
        Object.setPrototypeOf(classInstance, ClassType.prototype);
      }

      // Validate with timeout
      const validationPromise = validate(classInstance, {
        skipMissingProperties: mergedOptions.skipMissingProperties,
        whitelist: mergedOptions.whitelist,
        forbidNonWhitelisted: mergedOptions.forbidNonWhitelisted,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Validation timed out after ${mergedOptions.validationTimeout}ms`));
        }, mergedOptions.validationTimeout);
      });

      const errors = await Promise.race([validationPromise, timeoutPromise]) as ClassValidatorError[];

      // Calculate validation duration
      const [seconds, nanoseconds] = process.hrtime(validationStart);
      const validationDuration = seconds * 1000 + nanoseconds / 1000000;

      // Record validation metrics
      recordValidationMetrics(validationDuration, errors.length > 0);

      if (errors.length > 0) {
        // Map validation errors to standard format
        const validationErrors: ValidationError[] = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
          value: error.value
        }));

        // Record validation error patterns
        recordValidationErrorPatterns(validationErrors);

        return res.status(400).json(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Validation failed',
            { errors: validationErrors }
          )
        );
      }

      // Cache successful validation result
      if (mergedOptions.enableCache) {
        validationCache.set(req.body, true);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Records validation performance metrics
 * @param duration - Validation duration in milliseconds
 * @param failed - Whether validation failed
 */
function recordValidationMetrics(duration: number, failed: boolean): void {
  // Implementation would depend on metrics collection system
  // Example using console for demonstration
  console.debug(`Validation completed in ${duration}ms, failed: ${failed}`);
}

/**
 * Records validation error patterns for monitoring and analysis
 * @param errors - Array of validation errors
 */
function recordValidationErrorPatterns(errors: ValidationError[]): void {
  // Implementation would depend on error tracking system
  // Example using console for demonstration
  console.debug('Validation errors:', errors);
}

export default validate;
```

This implementation provides a robust validation middleware that:

1. Implements comprehensive request validation with configurable options
2. Includes sanitization of input data
3. Provides performance monitoring and metrics collection
4. Implements caching for improved performance
5. Handles validation timeouts
6. Provides detailed error reporting
7. Follows security best practices
8. Is fully type-safe with TypeScript

Key features:
- Content-type and body size validation
- Input sanitization
- Strict validation options
- Performance monitoring
- Validation caching
- Timeout handling
- Detailed error reporting
- Metrics collection
- Memory-efficient caching using WeakMap
- Comprehensive configuration options
- Type safety throughout

The middleware can be used in API routes like this:
```typescript
app.post('/api/habits', validate(CreateHabitDto), habitController.create);