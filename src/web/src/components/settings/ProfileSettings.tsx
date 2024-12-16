import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.0.0
import {
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Divider
} from '@mui/material'; // v5.0.0
import { toast } from 'react-toastify'; // v9.0.0
import Input from '../common/Input';
import { validateProfileUpdate, VALID_TIMEZONES } from '../../validators/profile.validator';
import { useAuth } from '../../hooks/useAuth';

/**
 * Interface for profile form data with strict typing
 */
interface ProfileFormData {
  displayName: string;
  email: string;
  timezone: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

/**
 * ProfileSettings component for managing user profile settings
 * Implements comprehensive form validation and accessibility features
 */
const ProfileSettings: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuth();

  // Form state management
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: user?.displayName || '',
    email: user?.email || '',
    timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    notificationPreferences: {
      email: true,
      push: true,
      inApp: true,
      ...user?.notificationPreferences,
    },
  });

  // Error state management
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields] = useState(new Set<string>());

  /**
   * Memoized timezone options for performance
   */
  const timezoneOptions = useMemo(() => {
    return VALID_TIMEZONES.map(tz => ({
      value: tz,
      label: tz.replace('_', ' '),
    }));
  }, []);

  /**
   * Handles input field changes with validation
   */
  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => {
      if (field.startsWith('notificationPreferences.')) {
        const prefKey = field.split('.')[1];
        return {
          ...prev,
          notificationPreferences: {
            ...prev.notificationPreferences,
            [prefKey]: value,
          },
        };
      }
      return { ...prev, [field]: value };
    });

    touchedFields.add(field);
    setIsDirty(true);
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, [touchedFields]);

  /**
   * Handles form submission with validation
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const validationResult = validateProfileUpdate(formData);

      if (!validationResult.success) {
        setErrors(validationResult.errors);
        toast.error('Please correct the errors in the form');
        return;
      }

      const result = await updateProfile(validationResult.sanitizedData);

      if (result.success) {
        toast.success('Profile updated successfully');
        setIsDirty(false);
      } else {
        toast.error(result.error?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Effect to sync form data with user data
   */
  useEffect(() => {
    if (user && !isDirty) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        notificationPreferences: {
          email: true,
          push: true,
          inApp: true,
          ...user.notificationPreferences,
        },
      });
    }
  }, [user, isDirty]);

  return (
    <Card component="form" onSubmit={handleSubmit} aria-label="Profile Settings Form">
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="h5" component="h2" gutterBottom>
            Profile Settings
          </Typography>

          <Input
            name="displayName"
            type="text"
            label="Display Name"
            value={formData.displayName}
            onChange={(value) => handleInputChange('displayName', value)}
            error={errors.displayName}
            required
            aria-label="Display Name"
          />

          <Input
            name="email"
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={(value) => handleInputChange('email', value)}
            error={errors.email}
            required
            aria-label="Email Address"
          />

          <Input
            name="timezone"
            type="text"
            label="Timezone"
            value={formData.timezone}
            onChange={(value) => handleInputChange('timezone', value)}
            error={errors.timezone}
            required
            aria-label="Timezone"
          />

          <Divider />

          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.notificationPreferences.email}
                  onChange={(e) => handleInputChange('notificationPreferences.email', e.target.checked)}
                  name="emailNotifications"
                />
              }
              label="Email Notifications"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.notificationPreferences.push}
                  onChange={(e) => handleInputChange('notificationPreferences.push', e.target.checked)}
                  name="pushNotifications"
                />
              }
              label="Push Notifications"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.notificationPreferences.inApp}
                  onChange={(e) => handleInputChange('notificationPreferences.inApp', e.target.checked)}
                  name="inAppNotifications"
                />
              }
              label="In-App Notifications"
            />
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setFormData({
                  displayName: user?.displayName || '',
                  email: user?.email || '',
                  timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                  notificationPreferences: {
                    email: true,
                    push: true,
                    inApp: true,
                    ...user?.notificationPreferences,
                  },
                });
                setErrors({});
                setIsDirty(false);
              }}
              disabled={isSubmitting || !isDirty}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !isDirty || Object.keys(errors).length > 0}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              Save Changes
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;