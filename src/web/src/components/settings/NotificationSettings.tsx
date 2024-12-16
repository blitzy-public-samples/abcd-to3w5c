import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // v8.x
import debounce from 'lodash/debounce'; // v4.x
import Card from '../common/Card';
import Switch from '../common/Switch';
import { useNotification } from '../../hooks/useNotification';
import { useAnalytics } from '../../hooks/useAnalytics';

/**
 * Interface for notification preferences state
 */
interface NotificationPreferences {
  dailyReminders: boolean;
  weeklyReport: boolean;
  achievementAlerts: boolean;
  streakWarnings: boolean;
}

/**
 * NotificationSettings component provides an accessible interface for managing
 * user notification preferences with real-time feedback and analytics tracking.
 */
const NotificationSettings: React.FC = React.memo(() => {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const { trackPreferenceChange } = useAnalytics();

  // Local state for notification preferences
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    dailyReminders: true,
    weeklyReport: false,
    achievementAlerts: true,
    streakWarnings: true
  });

  // Loading states for individual preferences
  const [loading, setLoading] = useState<Record<keyof NotificationPreferences, boolean>>({
    dailyReminders: false,
    weeklyReport: false,
    achievementAlerts: false,
    streakWarnings: false
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Debounced function to update preferences in the backend
   */
  const updatePreference = useCallback(
    debounce(async (key: keyof NotificationPreferences, value: boolean) => {
      try {
        // API call would go here
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulated API call

        // Track preference change in analytics
        trackPreferenceChange(key, value);

        showNotification({
          message: `${key} notifications ${value ? 'enabled' : 'disabled'}`,
          type: 'success',
          duration: 3000
        });

        setLoading(prev => ({ ...prev, [key]: false }));
      } catch (err) {
        setError('Failed to update notification preferences');
        setLoading(prev => ({ ...prev, [key]: false }));
        
        showNotification({
          message: 'Failed to update notification preferences',
          type: 'error',
          duration: 5000
        });

        // Revert the change
        setPreferences(prev => ({ ...prev, [key]: !value }));
      }
    }, 500),
    [showNotification, trackPreferenceChange]
  );

  /**
   * Handles preference toggle with loading state and error handling
   */
  const handlePreferenceChange = useCallback(
    async (key: keyof NotificationPreferences) => {
      setLoading(prev => ({ ...prev, [key]: true }));
      setError(null);

      const newValue = !preferences[key];
      setPreferences(prev => ({ ...prev, [key]: newValue }));

      // Update preference with debouncing
      updatePreference(key, newValue);
    },
    [preferences, updatePreference]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      updatePreference.cancel();
    };
  }, [updatePreference]);

  return (
    <Card
      className="notification-settings"
      elevation="low"
      aria-labelledby="notification-settings-title"
      testId="notification-settings"
    >
      <h2
        id="notification-settings-title"
        className="text-xl font-semibold mb-4"
      >
        Notification Preferences
      </h2>

      {error && (
        <div
          role="alert"
          className="text-error mb-4"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Daily Reminders */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label
              htmlFor="daily-reminders"
              className="font-medium"
            >
              Daily Reminders
            </label>
            <p className="text-sm text-gray-600">
              Get reminded of your daily habits
            </p>
          </div>
          <Switch
            id="daily-reminders"
            checked={preferences.dailyReminders}
            onChange={() => handlePreferenceChange('dailyReminders')}
            disabled={loading.dailyReminders}
            ariaLabel="Toggle daily reminders"
          />
        </div>

        {/* Weekly Summary */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label
              htmlFor="weekly-report"
              className="font-medium"
            >
              Weekly Summary
            </label>
            <p className="text-sm text-gray-600">
              Receive a weekly progress report
            </p>
          </div>
          <Switch
            id="weekly-report"
            checked={preferences.weeklyReport}
            onChange={() => handlePreferenceChange('weeklyReport')}
            disabled={loading.weeklyReport}
            ariaLabel="Toggle weekly summary"
          />
        </div>

        {/* Achievement Alerts */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label
              htmlFor="achievement-alerts"
              className="font-medium"
            >
              Achievement Alerts
            </label>
            <p className="text-sm text-gray-600">
              Get notified when you earn achievements
            </p>
          </div>
          <Switch
            id="achievement-alerts"
            checked={preferences.achievementAlerts}
            onChange={() => handlePreferenceChange('achievementAlerts')}
            disabled={loading.achievementAlerts}
            ariaLabel="Toggle achievement alerts"
          />
        </div>

        {/* Streak Warnings */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label
              htmlFor="streak-warnings"
              className="font-medium"
            >
              Streak Warnings
            </label>
            <p className="text-sm text-gray-600">
              Get warned when you're about to break a streak
            </p>
          </div>
          <Switch
            id="streak-warnings"
            checked={preferences.streakWarnings}
            onChange={() => handlePreferenceChange('streakWarnings')}
            disabled={loading.streakWarnings}
            ariaLabel="Toggle streak warnings"
          />
        </div>
      </div>
    </Card>
  );
});

// Set display name for debugging
NotificationSettings.displayName = 'NotificationSettings';

export default NotificationSettings;