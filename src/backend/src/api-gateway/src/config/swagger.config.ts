/**
 * @fileoverview Swagger/OpenAPI configuration for the Habit Tracking API Gateway.
 * Provides comprehensive API documentation with security schemes, rate limiting,
 * and error handling specifications.
 * 
 * @version 1.0.0
 */

import { Options } from 'swagger-ui-express'; // v4.6.3
import { BaseResponse } from '../../../shared/interfaces/base.interface';

/**
 * Interface for the complete Swagger configuration including
 * OpenAPI specification and UI options.
 */
interface SwaggerConfig {
  definition: OpenAPIObject;
  options: Options;
}

/**
 * Custom UI options for Swagger documentation interface.
 * Configures appearance and behavior of the documentation portal.
 */
const SWAGGER_OPTIONS: Options = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    tagsSorter: 'alpha',
  },
  customCssUrl: '/swagger-ui.css',
  customSiteTitle: 'Habit Tracker API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * Creates the OpenAPI specification object with comprehensive documentation
 * of all API endpoints, security schemes, and error handling.
 */
const createSwaggerDefinition = (): OpenAPIObject => ({
  openapi: '3.0.0',
  info: {
    title: 'Habit Tracker API',
    version: '1.0.0',
    description: 'RESTful API for the Habit Tracking application',
    contact: {
      name: 'API Support',
      email: 'support@habittracker.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Production API',
    },
    {
      url: '/api/v1-staging',
      description: 'Staging API',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authorization token',
      },
      oauth2: {
        type: 'oauth2',
        description: 'OAuth2.0 authorization',
        flows: {
          authorizationCode: {
            authorizationUrl: '/auth/oauth/authorize',
            tokenUrl: '/auth/oauth/token',
            scopes: {
              'habits:read': 'Read habits',
              'habits:write': 'Create and modify habits',
              'analytics:read': 'View analytics',
              'user:read': 'Read user profile',
              'user:write': 'Modify user profile',
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          code: {
            type: 'integer',
            description: 'Error code for client handling',
            example: 4001,
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
          },
          details: {
            type: 'object',
            description: 'Additional error context',
          },
        },
        required: ['success', 'timestamp', 'code', 'message'],
      },
      BaseResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          message: {
            type: 'string',
          },
        },
        required: ['success', 'timestamp', 'message'],
      },
      RateLimit: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: 'Rate limit ceiling for the endpoint',
          },
          remaining: {
            type: 'integer',
            description: 'Number of requests remaining in the time window',
          },
          reset: {
            type: 'integer',
            description: 'Unix timestamp when the rate limit resets',
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination (1-based)',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
      },
    },
    headers: {
      'X-RateLimit-Limit': {
        schema: {
          type: 'integer',
        },
        description: 'Request limit per minute',
      },
      'X-RateLimit-Remaining': {
        schema: {
          type: 'integer',
        },
        description: 'Remaining requests in the time window',
      },
      'X-RateLimit-Reset': {
        schema: {
          type: 'integer',
        },
        description: 'Unix timestamp when the rate limit resets',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication credentials are missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              timestamp: '2023-11-14T12:00:00.000Z',
              code: 2001,
              message: 'Invalid or expired authentication token',
            },
          },
        },
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': {
            $ref: '#/components/headers/X-RateLimit-Limit',
          },
          'X-RateLimit-Remaining': {
            $ref: '#/components/headers/X-RateLimit-Remaining',
          },
          'X-RateLimit-Reset': {
            $ref: '#/components/headers/X-RateLimit-Reset',
          },
        },
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              timestamp: '2023-11-14T12:00:00.000Z',
              code: 4029,
              message: 'Rate limit exceeded. Please try again later.',
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
    {
      oauth2: ['habits:read', 'habits:write'],
    },
  ],
  tags: [
    {
      name: 'Habits',
      description: 'Habit management endpoints',
    },
    {
      name: 'Analytics',
      description: 'Analytics and reporting endpoints',
    },
    {
      name: 'User',
      description: 'User profile and settings endpoints',
    },
  ],
});

/**
 * Complete Swagger configuration object combining OpenAPI specification
 * and UI customization options.
 */
export const swaggerConfig: SwaggerConfig = {
  definition: createSwaggerDefinition(),
  options: SWAGGER_OPTIONS,
};

/**
 * Type declaration for OpenAPI specification object.
 * Provides type safety for the Swagger configuration.
 */
interface OpenAPIObject {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
    parameters?: Record<string, any>;
    headers?: Record<string, any>;
    responses?: Record<string, any>;
  };
  security: Array<Record<string, string[]>>;
  tags: Array<{
    name: string;
    description: string;
  }>;
}