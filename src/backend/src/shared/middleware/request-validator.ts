/**
 * @fileoverview Express middleware for comprehensive request validation using class-validator
 * and class-transformer libraries. Validates incoming request data against defined DTOs
 * and schemas, ensuring data integrity, proper typing, and security.
 * 
 * @version 1.0.0
 */

import { plainToClass } from 'class-transformer'; // v0.5.1
import { validate, ValidationError as ClassValidatorError } from 'class-validator'; // v0.14.0
import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { ErrorCodes } from '../constants/error-codes';
import { ValidationError } from '../interfaces/error.interface';
import { createErrorResponse } from '../utils/response.util';

/**
 * Configuration options for request validation behavior
 */
export interface ValidationOptions {
  /** Skip validation for missing properties */
  skipMissingProperties?: boolean;
  
  /** Remove non-whitelisted properties */
  whitelist?: boolean;
  
  /** Throw error for non-whitelisted properties */
  forbidNonWhitelisted?: boolean;
  
  /** Fields to filter from error messages */
  sensitiveFields?: string[];
}

/**
 * Type definition for request validator middleware function
 */
export type RequestValidatorType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  skipMissingProperties: false,
  whitelist: true,
  forbidNonWhitelisted: true,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
};

/**
 * Higher-order function that returns Express middleware for validating request data
 * against a DTO class with configurable options.
 * 
 * @param ClassType - Constructor type for validation DTO
 * @param options - ValidationOptions for configuring validation behavior
 * @returns Express middleware function that validates requests
 */
export const requestValidator = <T extends object>(
  ClassType: new () => T,
  options: ValidationOptions = {}
): RequestValidatorType => {
  // Merge provided options with defaults
  const validationOptions = {
    ...DEFAULT_VALIDATION_OPTIONS,
    ...options
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Transform request body to class instance
      const transformedBody = plainToClass(ClassType, req.body);

      // Validate the transformed instance
      const validationErrors: ClassValidatorError[] = await validate(transformedBody, {
        skipMissingProperties: validationOptions.skipMissingProperties,
        whitelist: validationOptions.whitelist,
        forbidNonWhitelisted: validationOptions.forbidNonWhitelisted
      });

      if (validationErrors.length > 0) {
        // Map validation errors to standardized format
        const errors: ValidationError[] = mapValidationErrors(
          validationErrors,
          validationOptions.sensitiveFields || []
        );

        // Send error response
        res.status(400).json(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Request validation failed',
            { errors }
          )
        );
        return;
      }

      // Attach validated data to request
      req.body = transformedBody;
      next();
    } catch (error) {
      // Handle unexpected validation errors
      res.status(500).json(
        createErrorResponse(
          ErrorCodes.SYSTEM_ERROR,
          'Validation processing failed',
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  };
};

/**
 * Maps class-validator errors to standardized ValidationError format
 * while filtering sensitive field information
 * 
 * @param errors - Array of class-validator ValidationError objects
 * @param sensitiveFields - Array of field names to filter from error messages
 * @returns Array of standardized ValidationError objects
 */
const mapValidationErrors = (
  errors: ClassValidatorError[],
  sensitiveFields: string[]
): ValidationError[] => {
  const mappedErrors: ValidationError[] = [];

  const processError = (error: ClassValidatorError, parentPath: string = '') => {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    // Skip sensitive fields
    if (sensitiveFields.some(field => fieldPath.toLowerCase().includes(field))) {
      return;
    }

    // Add constraint violations
    if (error.constraints) {
      Object.values(error.constraints).forEach(message => {
        mappedErrors.push({
          field: fieldPath,
          message,
          value: sanitizeErrorValue(error.value, fieldPath, sensitiveFields)
        });
      });
    }

    // Process nested errors
    if (error.children && error.children.length > 0) {
      error.children.forEach(childError => {
        processError(childError, fieldPath);
      });
    }
  };

  errors.forEach(error => processError(error));
  return mappedErrors;
};

/**
 * Sanitizes error values to prevent sensitive data exposure
 * 
 * @param value - The value to sanitize
 * @param fieldPath - The full path of the field
 * @param sensitiveFields - Array of sensitive field names
 * @returns Sanitized value or '[REDACTED]' for sensitive fields
 */
const sanitizeErrorValue = (
  value: any,
  fieldPath: string,
  sensitiveFields: string[]
): any => {
  // Redact sensitive values
  if (sensitiveFields.some(field => fieldPath.toLowerCase().includes(field))) {
    return '[REDACTED]';
  }

  // Handle different value types
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return '[Array]';
    }
    return '[Object]';
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  return value;
};

export default requestValidator;
```

This implementation provides a robust request validation middleware that:

1. Uses class-transformer and class-validator for type-safe validation
2. Supports configurable validation options
3. Implements comprehensive error handling
4. Provides detailed validation error messages
5. Protects sensitive data
6. Follows enterprise-grade coding practices

Key features:

1. Type Safety:
- Leverages TypeScript generics for type-safe validation
- Uses class-transformer for proper object transformation
- Implements strict type checking

2. Security:
- Sanitizes sensitive field information
- Implements whitelisting of properties
- Provides configurable validation options

3. Error Handling:
- Maps validation errors to standardized format
- Provides detailed error messages
- Handles nested validation errors
- Implements proper error response structure

4. Configurability:
- Supports custom validation options
- Allows configuration of sensitive fields
- Provides default options with secure defaults

5. Documentation:
- Comprehensive JSDoc comments
- Clear type definitions
- Detailed function documentation

The middleware can be used in route handlers like this:

```typescript
app.post('/api/habits', requestValidator(CreateHabitDTO), habitController.create);