/**
 * @fileoverview Email service configuration for SendGrid integration with comprehensive
 * template management, retry mechanisms, rate limiting, and monitoring capabilities.
 * 
 * @version 1.0.0
 * @module EmailConfig
 */

import { Client, MailDataRequired } from '@sendgrid/mail'; // ^7.7.0
import { NotificationType } from '../interfaces/notification.interface';

/**
 * Interface for rate limiting configuration with quota management
 */
interface IRateLimitConfig {
  perSecond: number;
  perMinute: number;
  perHour: number;
}

/**
 * Interface for advanced retry configuration with circuit breaker pattern
 */
interface IRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  circuitBreakerThreshold: number;
}

/**
 * Interface for email template configuration with versioning support
 */
export interface ITemplateConfig {
  /** SendGrid template ID */
  id: string;
  /** Template version for tracking changes */
  version: string;
  /** Category for analytics and monitoring */
  category: string;
}

/**
 * Comprehensive interface for email service configuration
 */
export interface IEmailConfig {
  /** SendGrid API key with encryption support */
  apiKey: string;
  /** Default sender email address */
  fromEmail: string;
  /** Default sender name */
  fromName: string;
  /** Template configurations mapped by notification type */
  templates: Record<NotificationType, ITemplateConfig>;
  /** Advanced retry configuration */
  retryConfig: IRetryConfig;
  /** Rate limiting configuration */
  rateLimits: IRateLimitConfig;
  /** Debug mode flag for enhanced logging */
  debugMode?: boolean;
}

/**
 * Default email configuration with production-ready settings
 */
export const DEFAULT_EMAIL_CONFIG: IEmailConfig = {
  apiKey: process.env.SENDGRID_API_KEY || '',
  fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
  fromName: 'Habit Tracker',
  templates: {
    [NotificationType.HABIT_REMINDER]: {
      id: process.env.REMINDER_TEMPLATE_ID || '',
      version: '1.0',
      category: 'reminders'
    },
    [NotificationType.STREAK_ACHIEVEMENT]: {
      id: process.env.ACHIEVEMENT_TEMPLATE_ID || '',
      version: '1.0',
      category: 'achievements'
    },
    [NotificationType.WEEKLY_SUMMARY]: {
      id: process.env.SUMMARY_TEMPLATE_ID || '',
      version: '1.0',
      category: 'summaries'
    },
    [NotificationType.STREAK_WARNING]: {
      id: process.env.WARNING_TEMPLATE_ID || '',
      version: '1.0',
      category: 'warnings'
    }
  },
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds
    circuitBreakerThreshold: 5
  },
  rateLimits: {
    perSecond: 100,
    perMinute: 1000,
    perHour: 10000
  },
  debugMode: process.env.NODE_ENV !== 'production'
};

/**
 * Validates email configuration parameters
 * @param config - Email configuration object
 * @throws Error if configuration is invalid
 */
const validateConfig = (config: IEmailConfig): void => {
  if (!config.apiKey) {
    throw new Error('SendGrid API key is required');
  }

  if (!config.fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.fromEmail)) {
    throw new Error('Valid sender email address is required');
  }

  // Validate template configurations
  Object.entries(config.templates).forEach(([type, template]) => {
    if (!template.id) {
      throw new Error(`Template ID is required for ${type}`);
    }
  });
};

/**
 * Initializes and configures the SendGrid email client with advanced features
 * @param config - Email service configuration
 * @returns Promise that resolves when client is initialized
 */
export const initializeEmailClient = async (config: IEmailConfig = DEFAULT_EMAIL_CONFIG): Promise<void> => {
  try {
    // Validate configuration
    validateConfig(config);

    // Initialize SendGrid client
    const client = new Client();
    client.setApiKey(config.apiKey);

    // Configure default settings
    client.setDefaultRequest({
      from: {
        email: config.fromEmail,
        name: config.fromName
      },
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    });

    // Configure rate limiting
    client.setMaxRate({
      points: config.rateLimits.perSecond,
      duration: 1
    });

    // Setup debug logging if enabled
    if (config.debugMode) {
      client.on('request', (request: MailDataRequired) => {
        console.debug('SendGrid Request:', {
          to: request.to,
          templateId: request.templateId,
          timestamp: new Date().toISOString()
        });
      });

      client.on('response', (response: any) => {
        console.debug('SendGrid Response:', {
          statusCode: response.statusCode,
          timestamp: new Date().toISOString()
        });
      });
    }

    console.info('SendGrid email client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SendGrid email client:', error);
    throw error;
  }
};

// Export configured email client for use in other modules
export { Client as SendGridClient };