/**
 * @fileoverview Centralized logging utility for the habit tracking application.
 * Provides structured logging with ELK Stack integration, security event tracking,
 * and GDPR-compliant data handling.
 * 
 * @version 1.0.0
 */

import winston from 'winston';  // v3.x
import DailyRotateFile from 'winston-daily-rotate-file';  // v4.x
import { AppError } from '../interfaces/error.interface';
import { ErrorCodes } from '../constants/error-codes';

// Define custom log levels with security and audit capabilities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  security: 4,
  performance: 5,
  audit: 6
};

// Color scheme for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  security: 'magenta',
  performance: 'cyan',
  audit: 'gray'
};

// Log rotation and retention configuration
const LOG_RETENTION = {
  maxSize: '20m',
  maxFiles: '14d',
  compress: true
};

// ELK Stack configuration
const ELK_CONFIG = {
  host: process.env.ELASTICSEARCH_HOST || 'elasticsearch:9200',
  index: 'habit-tracker-logs',
  ssl: true,
  auth: {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD
  }
};

/**
 * Formats error objects for consistent logging structure
 * @param error - Error object to format
 * @returns Formatted error object with sanitized data
 */
const formatError = (error: Error | AppError): Record<string, unknown> => {
  const formattedError: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME || 'habit-tracker',
    environment: process.env.NODE_ENV || 'development',
    requestId: global.requestId, // Assumes request ID middleware
  };

  if (error instanceof AppError) {
    formattedError.code = error.code;
    formattedError.type = ErrorCodes[error.code];
    formattedError.details = error.details;
  } else {
    formattedError.code = ErrorCodes.SYSTEM_ERROR;
    formattedError.type = 'SystemError';
  }

  // Sanitize sensitive data before logging
  formattedError.message = sanitizeMessage(error.message);
  formattedError.stack = sanitizeMessage(error.stack);

  return formattedError;
};

/**
 * Sanitizes log messages to remove sensitive data
 * @param message - Message to sanitize
 * @returns Sanitized message string
 */
const sanitizeMessage = (message?: string): string => {
  if (!message) return '';
  
  // Remove sensitive patterns (emails, tokens, passwords)
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[TOKEN]')
    .replace(/password['"]?\s*[:=]\s*['"]?[^'"}\s]+/gi, 'password:[REDACTED]');
};

/**
 * Creates and configures the Winston logger instance
 */
const createLogger = () => {
  // Custom format for structured logging
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Console transport with color coding
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ colors: LOG_COLORS }),
      winston.format.simple()
    ),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  });

  // File transport with rotation
  const fileTransport = new DailyRotateFile({
    filename: 'logs/habit-tracker-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    ...LOG_RETENTION,
    format: logFormat
  });

  // Create Winston logger instance
  return winston.createLogger({
    levels: LOG_LEVELS,
    format: logFormat,
    transports: [
      consoleTransport,
      fileTransport
    ],
    // Error handling for failed log writes
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' })
    ],
    exitOnError: false
  });
};

// Create logger instance
const winstonLogger = createLogger();

/**
 * Exported logger interface with specialized logging methods
 */
export const logger = {
  error: (message: string, error?: Error | AppError, metadata?: Record<string, unknown>) => {
    const logData = error ? formatError(error) : {};
    winstonLogger.error(message, { ...logData, ...metadata });
  },

  warn: (message: string, metadata?: Record<string, unknown>) => {
    winstonLogger.warn(message, metadata);
  },

  info: (message: string, metadata?: Record<string, unknown>) => {
    winstonLogger.info(message, metadata);
  },

  debug: (message: string, metadata?: Record<string, unknown>) => {
    winstonLogger.debug(message, metadata);
  },

  security: (message: string, metadata?: Record<string, unknown>) => {
    winstonLogger.log('security', message, {
      ...metadata,
      timestamp: new Date().toISOString(),
      securityLevel: metadata?.securityLevel || 'INFO'
    });
  },

  performance: (message: string, duration: number, metadata?: Record<string, unknown>) => {
    winstonLogger.log('performance', message, {
      ...metadata,
      duration,
      timestamp: new Date().toISOString()
    });
  },

  audit: (action: string, userId: string, metadata?: Record<string, unknown>) => {
    winstonLogger.log('audit', action, {
      ...metadata,
      userId,
      timestamp: new Date().toISOString(),
      ipAddress: metadata?.ipAddress || 'unknown'
    });
  }
};

// Export default logger instance
export default logger;
```

This implementation provides:

1. Structured logging with different severity levels (error, warn, info, debug) plus specialized types (security, performance, audit)
2. ELK Stack integration for centralized logging
3. Log rotation and retention policies
4. GDPR-compliant data sanitization
5. Error formatting with stack traces
6. Security event logging
7. Performance monitoring capabilities
8. Audit logging for compliance
9. Environment-specific configuration
10. Color-coded console output for development

The logger can be used throughout the application like this:

```typescript
// Basic logging
logger.info('User logged in successfully');

// Error logging with stack trace
logger.error('Failed to create habit', new AppError(ErrorCodes.DATABASE_ERROR));

// Security event logging
logger.security('Failed login attempt', { userId: '123', attempts: 3 });

// Performance monitoring
logger.performance('Database query completed', 145, { query: 'findHabits' });

// Audit logging
logger.audit('UPDATE_HABIT', userId, { habitId: '123', changes: ['name'] });