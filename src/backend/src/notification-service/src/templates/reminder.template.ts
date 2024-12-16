/**
 * @fileoverview Production-ready email template generator for habit reminders
 * Provides responsive, localized, and cross-client compatible email templates
 * with enhanced security and tracking capabilities.
 * 
 * @version 1.0.0
 */

import { NotificationType } from '../interfaces/notification.interface';
import sanitizeHtml from 'sanitize-html'; // v2.10.0
import { format } from 'date-fns-tz'; // v2.0.0

/**
 * Interface defining required data for reminder email template generation
 */
interface IReminderTemplateData {
  habitName: string;
  userName: string;
  scheduledTime: string;
  currentStreak: number;
  locale: string;
  timezone: string;
}

/**
 * Enhanced CSS styles for email template with cross-client compatibility
 */
const TEMPLATE_STYLES = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  primaryColor: '#4A90E2',
  backgroundColor: '#F5F5F5',
  textColor: '#333333',
  breakpoints: {
    mobile: '480px',
    tablet: '768px'
  },
  emailClientResets: {
    outlook: `<!--[if mso]>
      <style type="text/css">
        table {border-collapse: collapse;}
        td {padding: 0;}
      </style>
      <![endif]-->`,
    gmail: '* { -webkit-text-size-adjust: none; }'
  }
} as const;

/**
 * Localized content for reminder emails with motivational variations
 */
const REMINDER_COPY = {
  en: {
    greeting: 'Hi {userName}',
    reminderText: 'Time to complete your habit: {habitName}',
    streakText: 'Keep your {streak} day streak going!',
    callToAction: 'Complete Now',
    motivationalQuotes: [
      "You're doing great!",
      'Stay consistent!',
      'Every day counts!',
      'Keep up the momentum!',
      'Building better habits, one day at a time!'
    ]
  }
  // Add more locales as needed
} as const;

/**
 * Generates a random motivational quote from the available options
 * @param locale - User's preferred language
 * @returns Random motivational quote
 */
const getRandomMotivationalQuote = (locale: string): string => {
  const quotes = REMINDER_COPY[locale as keyof typeof REMINDER_COPY]?.motivationalQuotes || REMINDER_COPY.en.motivationalQuotes;
  return quotes[Math.floor(Math.random() * quotes.length)];
};

/**
 * Generates responsive HTML content for habit reminder emails
 * @param templateData - Data required for template generation
 * @returns HTML content with inline styles and client-specific adjustments
 */
export const generateReminderTemplate = (templateData: IReminderTemplateData): string => {
  // Validate input data
  if (!templateData.habitName || !templateData.userName || !templateData.scheduledTime) {
    throw new Error('Missing required template data');
  }

  // Sanitize input data
  const sanitizedData = {
    habitName: sanitizeHtml(templateData.habitName, { allowedTags: [] }),
    userName: sanitizeHtml(templateData.userName, { allowedTags: [] }),
    scheduledTime: sanitizeHtml(templateData.scheduledTime, { allowedTags: [] }),
    currentStreak: Math.max(0, templateData.currentStreak)
  };

  // Format time according to user's timezone
  const formattedTime = format(
    new Date(sanitizedData.scheduledTime),
    'h:mm a',
    { timeZone: templateData.timezone }
  );

  // Select localized copy
  const copy = REMINDER_COPY[templateData.locale as keyof typeof REMINDER_COPY] || REMINDER_COPY.en;

  // Generate tracking parameters
  const trackingParams = new URLSearchParams({
    utm_source: 'habit_reminder',
    utm_medium: 'email',
    utm_campaign: NotificationType.HABIT_REMINDER,
    habit_id: sanitizedData.habitName.toLowerCase().replace(/\s+/g, '_')
  }).toString();

  // Generate the responsive email template
  return `
    <!DOCTYPE html>
    <html lang="${templateData.locale || 'en'}" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Habit Reminder</title>
      ${TEMPLATE_STYLES.emailClientResets.outlook}
      <style type="text/css">
        ${TEMPLATE_STYLES.emailClientResets.gmail}
        
        body, table, td {
          font-family: ${TEMPLATE_STYLES.fontFamily};
          margin: 0;
          padding: 0;
          width: 100%;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        @media screen and (max-width: ${TEMPLATE_STYLES.breakpoints.mobile}) {
          .mobile-stack {
            display: block !important;
            width: 100% !important;
          }
          .mobile-padding {
            padding: 10px !important;
          }
        }
      </style>
    </head>
    <body style="background-color: ${TEMPLATE_STYLES.backgroundColor}; margin: 0; padding: 0;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="mobile-stack">
              <tr>
                <td align="left" bgcolor="#ffffff" style="padding: 40px 30px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h1 style="color: ${TEMPLATE_STYLES.textColor}; font-size: 24px; margin: 0 0 20px 0;">
                    ${copy.greeting.replace('{userName}', sanitizedData.userName)}
                  </h1>
                  
                  <p style="color: ${TEMPLATE_STYLES.textColor}; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    ${copy.reminderText.replace('{habitName}', sanitizedData.habitName)}
                    <br>
                    <strong>Scheduled for: ${formattedTime}</strong>
                  </p>
                  
                  ${sanitizedData.currentStreak > 0 ? `
                    <p style="color: ${TEMPLATE_STYLES.textColor}; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      ${copy.streakText.replace('{streak}', sanitizedData.currentStreak.toString())}
                    </p>
                  ` : ''}
                  
                  <p style="color: ${TEMPLATE_STYLES.textColor}; font-size: 16px; font-style: italic; margin: 0 0 30px 0;">
                    "${getRandomMotivationalQuote(templateData.locale)}"
                  </p>
                  
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <a href="https://app.habittracker.com/habits/check-in?${trackingParams}"
                           style="background-color: ${TEMPLATE_STYLES.primaryColor}; border-radius: 4px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; padding: 12px 24px; text-decoration: none;">
                          ${copy.callToAction}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim();
};

export default generateReminderTemplate;