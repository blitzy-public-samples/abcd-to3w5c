/**
 * @fileoverview Email template generator for achievement notifications with responsive,
 * accessible HTML and plain text templates. Supports dark mode and cross-client compatibility.
 * 
 * @version 1.0.0
 * @module AchievementTemplate
 */

import { NotificationType } from '../interfaces/notification.interface';
import { Template } from '@sendgrid/mail'; // @version 7.x

/**
 * Interface defining required data for achievement notification templates
 */
export interface AchievementTemplateData {
  userName: string;
  achievementTitle: string;
  achievementDescription: string;
  streakCount: number;
  habitName: string;
  isDarkMode: boolean;
  preferredLanguage: string;
}

// Template constants
export const ACHIEVEMENT_EMAIL_SUBJECT = 'Congratulations on Your Achievement! 🎉';
export const ACHIEVEMENT_TEMPLATE_ID = 'achievement-email-template';
export const TEMPLATE_CACHE_TTL = 3600;
export const MAX_TEMPLATE_SIZE = 102400;

/**
 * Generates responsive and accessible email templates for achievement notifications
 * 
 * @param {AchievementTemplateData} achievementData - Achievement notification data
 * @returns {Template} SendGrid template object with HTML and text versions
 */
export function generateAchievementEmailTemplate(achievementData: AchievementTemplateData): Template {
  // Sanitize input data
  const sanitizedData = {
    userName: sanitizeHtml(achievementData.userName),
    achievementTitle: sanitizeHtml(achievementData.achievementTitle),
    achievementDescription: sanitizeHtml(achievementData.achievementDescription),
    streakCount: Math.max(0, achievementData.streakCount),
    habitName: sanitizeHtml(achievementData.habitName),
  };

  // Generate HTML template
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="${achievementData.preferredLanguage}" xmlns:v="urn:schemas-microsoft-com:vml">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>${ACHIEVEMENT_EMAIL_SUBJECT}</title>
        <style>
          ${generateEmailStyles(achievementData.isDarkMode)}
        </style>
      </head>
      <body class="${achievementData.isDarkMode ? 'dark-mode' : 'light-mode'}">
        <div class="email-wrapper">
          <div class="email-header">
            <img src="achievement-badge.png" alt="Achievement Badge" class="achievement-badge" 
                 width="64" height="64">
            <h1>🎉 Congratulations, ${sanitizedData.userName}! 🎉</h1>
          </div>
          
          <div class="achievement-content">
            <h2>${sanitizedData.achievementTitle}</h2>
            <p class="achievement-description">${sanitizedData.achievementDescription}</p>
            
            <div class="achievement-details">
              <p class="streak-count">
                <strong>${sanitizedData.streakCount}-Day Streak</strong> 
                on "${sanitizedData.habitName}"
              </p>
            </div>
            
            <div class="cta-section">
              <a href="[[ViewDetailsLink]]" class="cta-button">View Your Achievement</a>
            </div>
          </div>
          
          <div class="email-footer">
            <p>Keep up the great work! 💪</p>
            <p class="footer-links">
              <a href="[[UnsubscribeLink]]">Unsubscribe</a> | 
              <a href="[[PreferencesLink]]">Notification Preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Generate plain text version
  const textContent = `
Congratulations, ${sanitizedData.userName}! 🎉

${sanitizedData.achievementTitle}
${sanitizedData.achievementDescription}

You've maintained a ${sanitizedData.streakCount}-day streak on "${sanitizedData.habitName}"!

Keep up the great work! 💪

View your achievement: [[ViewDetailsLink]]

---
Unsubscribe: [[UnsubscribeLink]]
Update preferences: [[PreferencesLink]]
  `.trim();

  // Return complete template object
  return {
    id: ACHIEVEMENT_TEMPLATE_ID,
    subject: ACHIEVEMENT_EMAIL_SUBJECT,
    html: htmlContent,
    text: textContent,
    categories: ['achievement', NotificationType.STREAK_ACHIEVEMENT],
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
  };
}

/**
 * Generates responsive email styles with dark mode support
 * 
 * @param {boolean} isDarkMode - Whether to use dark mode styles
 * @returns {string} CSS styles for email template
 */
function generateEmailStyles(isDarkMode: boolean): string {
  return `
    :root {
      color-scheme: light dark;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: ${isDarkMode ? '#ffffff' : '#1a1a1a'};
      background-color: ${isDarkMode ? '#1a1a1a' : '#ffffff'};
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .email-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .achievement-badge {
      display: block;
      margin: 0 auto 20px;
    }
    
    h1 {
      color: ${isDarkMode ? '#ffffff' : '#1a1a1a'};
      font-size: 24px;
      margin: 0 0 20px;
    }
    
    h2 {
      color: ${isDarkMode ? '#ffffff' : '#1a1a1a'};
      font-size: 20px;
      margin: 0 0 15px;
    }
    
    .achievement-content {
      background-color: ${isDarkMode ? '#2a2a2a' : '#f8f8f8'};
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 30px;
    }
    
    .achievement-description {
      margin: 0 0 20px;
      color: ${isDarkMode ? '#e0e0e0' : '#4a4a4a'};
    }
    
    .streak-count {
      font-size: 18px;
      margin: 0 0 20px;
    }
    
    .cta-button {
      display: inline-block;
      background-color: #4CAF50;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
    }
    
    .email-footer {
      text-align: center;
      font-size: 14px;
      color: ${isDarkMode ? '#b0b0b0' : '#666666'};
    }
    
    .footer-links a {
      color: ${isDarkMode ? '#b0b0b0' : '#666666'};
      text-decoration: underline;
    }
    
    @media (max-width: 480px) {
      .email-wrapper {
        padding: 15px;
      }
      
      h1 {
        font-size: 20px;
      }
      
      h2 {
        font-size: 18px;
      }
      
      .achievement-content {
        padding: 20px;
      }
    }
  `;
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * 
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}