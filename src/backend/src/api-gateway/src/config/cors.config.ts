/**
 * @file CORS Configuration for API Gateway
 * @version 1.0.0
 * @description Configures Cross-Origin Resource Sharing (CORS) settings with enhanced security 
 * features and environment-aware configuration.
 * 
 * @requires cors@2.8.5
 */

import cors, { CorsOptions } from 'cors';

/**
 * Environment-specific allowed origins configuration
 * Strictly defined for each deployment environment
 */
export const ALLOWED_ORIGINS: Record<string, string[]> = {
  development: ['http://localhost:3000'],
  staging: ['https://staging.habit-tracker.com'],
  production: ['https://habit-tracker.com']
} as const;

/**
 * Strictly defined allowed HTTP methods
 * Follows security best practices by explicitly defining allowed methods
 */
const ALLOWED_METHODS: string[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'OPTIONS'
] as const;

/**
 * Comprehensive list of allowed headers
 * Explicitly defines headers that can be included in requests
 */
const ALLOWED_HEADERS: string[] = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'X-CSRF-Token'
] as const;

/**
 * Headers exposed to client applications
 * Limited to necessary rate limiting information
 */
const EXPOSED_HEADERS: string[] = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset'
] as const;

/**
 * Validates origin against allowed patterns with logging
 * @param origin - Request origin to validate
 * @param callback - Validation result callback
 */
const validateOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void
): void => {
  // Skip origin check if no origin (e.g., same-origin requests)
  if (!origin) {
    callback(null, true);
    return;
  }

  const environment = process.env.NODE_ENV || 'development';
  const allowedOriginsList = ALLOWED_ORIGINS[environment] || ALLOWED_ORIGINS.development;

  const isAllowed = allowedOriginsList.some(allowedOrigin => {
    // Convert allowed origin to regex pattern if it contains wildcards
    if (allowedOrigin.includes('*')) {
      const pattern = new RegExp(
        `^${allowedOrigin.replace(/\*/g, '.*')}$`
      );
      return pattern.test(origin);
    }
    return allowedOrigin === origin;
  });

  // Log validation result for monitoring
  console.info(
    `CORS Origin Validation: ${origin} - ${isAllowed ? 'Allowed' : 'Blocked'}`
  );

  if (isAllowed) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  }
};

/**
 * Creates secure CORS configuration with environment awareness
 * @returns {CorsOptions} Configured CORS options with security enhancements
 */
export const createCorsConfig = (): CorsOptions => {
  const environment = process.env.NODE_ENV || 'development';

  const corsOptions: CorsOptions = {
    // Dynamic origin validation with logging
    origin: validateOrigin,

    // Strict method restrictions
    methods: ALLOWED_METHODS,

    // Explicit header configurations
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: EXPOSED_HEADERS,

    // Enable credentials for authenticated requests
    credentials: true,

    // Optimal preflight caching (1 hour)
    maxAge: 3600,

    // Successful OPTIONS response status
    optionsSuccessStatus: 200,

    // Don't pass preflight response to next handler
    preflightContinue: false
  };

  return corsOptions;
};

/**
 * Default export of the CORS configuration factory
 * @example
 * import corsConfig from './cors.config';
 * app.use(cors(corsConfig.createCorsConfig()));
 */
export default {
  createCorsConfig
};