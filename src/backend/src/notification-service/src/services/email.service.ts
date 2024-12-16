/**
 * @fileoverview Production-ready email service implementation using SendGrid
 * with comprehensive error handling, rate limiting, and security measures.
 * 
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { Client as SendGridClient, MailDataRequired } from '@sendgrid/mail'; // ^7.7.0
import { RateLimiter } from 'rate-limiter-flexible'; // ^2.4.1
import { IEmailConfig } from '../config/email.config';
import generateReminderTemplate from '../templates/reminder.template';
import { generateAchievementEmailTemplate } from '../templates/achievement.template';
import { NotificationType } from '../interfaces/notification.interface';

// Constants for email service configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Base delay in ms
const EMAIL_TIMEOUT = 5000;
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const RATE_LIMIT_MAX = 100;
const CIRCUIT_BREAKER_THRESHOLD = 5;

/**
 * Interface for email service operations
 */
interface IEmailService {
  sendReminderEmail(to: string, templateData: IReminderTemplateData): Promise<void>;
  sendAchievementEmail(to: string, templateData: AchievementTemplateData): Promise<void>;
}

/**
 * Production-ready email service implementation with comprehensive security and reliability features
 */
@injectable()
export class EmailService implements IEmailService {
  private emailClient: SendGridClient;
  private rateLimiter: RateLimiter;
  private circuitBreaker: {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
  };

  constructor(private readonly config: IEmailConfig) {
    // Initialize SendGrid client
    this.emailClient = new SendGridClient();
    this.emailClient.setApiKey(this.config.apiKey);

    // Configure rate limiter
    this.rateLimiter = new RateLimiter({
      points: this.config.rateLimits.perHour || RATE_LIMIT_MAX,
      duration: RATE_LIMIT_WINDOW,
    });

    // Initialize circuit breaker
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
    };

    // Configure default security headers
    this.emailClient.setDefaultRequest({
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'HabitTracker/1.0',
      },
    });
  }

  /**
   * Sends a habit reminder email with comprehensive error handling and retry logic
   */
  public async sendReminderEmail(to: string, templateData: IReminderTemplateData): Promise<void> {
    try {
      // Validate email address
      if (!this.isValidEmail(to)) {
        throw new Error('Invalid email address');
      }

      // Check rate limits
      await this.rateLimiter.consume(to);

      // Generate secure email content
      const htmlContent = generateReminderTemplate(templateData);

      // Prepare email data with security headers
      const emailData: MailDataRequired = {
        to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: 'Habit Reminder',
        html: htmlContent,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        category: [NotificationType.HABIT_REMINDER],
        customArgs: {
          type: NotificationType.HABIT_REMINDER,
          habitId: templateData.habitName,
        },
      };

      await this.sendWithRetry(emailData);
    } catch (error) {
      await this.handleSendError(error, { to, type: 'reminder' });
    }
  }

  /**
   * Sends an achievement notification email with tracking and analytics
   */
  public async sendAchievementEmail(to: string, templateData: AchievementTemplateData): Promise<void> {
    try {
      // Validate email address
      if (!this.isValidEmail(to)) {
        throw new Error('Invalid email address');
      }

      // Check rate limits
      await this.rateLimiter.consume(to);

      // Generate achievement email template
      const template = generateAchievementEmailTemplate(templateData);

      // Prepare email data with security measures
      const emailData: MailDataRequired = {
        to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: template.subject,
        html: template.html,
        text: template.text,
        trackingSettings: template.trackingSettings,
        category: template.categories,
        customArgs: {
          type: NotificationType.STREAK_ACHIEVEMENT,
          achievementTitle: templateData.achievementTitle,
        },
      };

      await this.sendWithRetry(emailData);
    } catch (error) {
      await this.handleSendError(error, { to, type: 'achievement' });
    }
  }

  /**
   * Handles email sending with retry logic and circuit breaker pattern
   */
  private async sendWithRetry(emailData: MailDataRequired, attempt = 1): Promise<void> {
    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen) {
        const cooldownPeriod = 60000; // 1 minute
        if (Date.now() - this.circuitBreaker.lastFailure < cooldownPeriod) {
          throw new Error('Circuit breaker is open');
        }
        this.circuitBreaker.isOpen = false;
      }

      await this.emailClient.send(emailData);
      
      // Reset circuit breaker on success
      this.circuitBreaker.failures = 0;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWithRetry(emailData, attempt + 1);
      }

      // Update circuit breaker
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailure = Date.now();
      if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreaker.isOpen = true;
      }

      throw error;
    }
  }

  /**
   * Handles email sending errors with logging and monitoring
   */
  private async handleSendError(error: Error, context: { to: string; type: string }): Promise<void> {
    console.error('Email sending failed:', {
      error: error.message,
      recipient: context.to,
      type: context.type,
      timestamp: new Date().toISOString(),
    });

    // Rethrow specific errors for proper handling upstream
    if (error.message.includes('rate limit') || error.message.includes('Circuit breaker')) {
      throw new Error(`Email service temporarily unavailable: ${error.message}`);
    }

    throw new Error(`Failed to send ${context.type} email: ${error.message}`);
  }

  /**
   * Validates email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default EmailService;