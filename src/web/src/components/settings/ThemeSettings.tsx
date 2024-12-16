// @mui/material version 5.x
// react version 18.x
// lodash version 4.x

import React, { useMemo, useCallback, Suspense } from 'react';
import { 
  FormControl, 
  FormControlLabel, 
  RadioGroup, 
  Radio, 
  Typography, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { debounce } from 'lodash';
import { ThemeMode } from '../../types/theme.types';
import useTheme from '../../hooks/useTheme';
import Switch from '../common/Switch';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * Props interface for ThemeSettings component
 */
interface ThemeSettingsProps {
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Disabled state for all controls */
  disabled?: boolean;
  /** Error callback for handling theme-related errors */
  onError?: (error: Error) => void;
}

/**
 * Theme options with proper accessibility labels
 */
const THEME_OPTIONS = [
  {
    value: ThemeMode.LIGHT,
    label: 'Light Mode',
    ariaLabel: 'Enable light theme'
  },
  {
    value: ThemeMode.DARK,
    label: 'Dark Mode',
    ariaLabel: 'Enable dark theme'
  },
  {
    value: ThemeMode.SYSTEM,
    label: 'System Default',
    ariaLabel: 'Use system theme preference'
  }
] as const;

/**
 * Debounce delay for theme changes to prevent rapid updates
 */
const THEME_CHANGE_DELAY = 300;

/**
 * Styled FormControl component with responsive layout
 */
const StyledFormControl = styled(FormControl)(({ theme }) => ({
  margin: theme.spacing(2, 0),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  width: '100%',
  maxWidth: '600px',

  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },

  '& .MuiTypography-root': {
    marginBottom: theme.spacing(2),
  },

  '& .MuiRadio-root': {
    marginRight: theme.spacing(1),
  },

  '& .MuiFormControlLabel-root': {
    marginLeft: 0,
    marginRight: 0,
    width: '100%',
  }
}));

/**
 * ThemeSettings component for managing theme preferences with accessibility
 * and error handling support.
 */
const ThemeSettings: React.FC<ThemeSettingsProps> = React.memo(({
  className,
  disabled = false,
  onError
}) => {
  // Get theme state and controls from custom hook
  const { 
    themeMode, 
    setThemeMode, 
    isSystemTheme,
    isLoading,
    error 
  } = useTheme();

  // Memoized error handler
  const handleError = useCallback((error: Error) => {
    console.error('Theme settings error:', error);
    onError?.(error);
  }, [onError]);

  // Debounced theme change handler
  const handleThemeModeChange = useMemo(() => 
    debounce((event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const newThemeMode = event.target.value as ThemeMode;
        setThemeMode(newThemeMode);
      } catch (error) {
        handleError(error as Error);
      }
    }, THEME_CHANGE_DELAY),
    [setThemeMode, handleError]
  );

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      handleThemeModeChange.cancel();
    };
  }, [handleThemeModeChange]);

  // Loading state
  if (isLoading) {
    return (
      <div role="status" aria-label="Loading theme settings">
        <CircularProgress size={24} />
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallbackTitle="Theme Settings Error"
      fallbackDescription="Unable to load theme settings. Please try again."
      onError={handleError}
    >
      <StyledFormControl 
        component="fieldset"
        className={className}
        disabled={disabled}
        aria-label="Theme settings"
      >
        <Typography 
          variant="h6" 
          component="legend"
          gutterBottom
        >
          Theme Preferences
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            role="alert"
          >
            {error.message}
          </Alert>
        )}

        <RadioGroup
          aria-label="Theme mode selection"
          name="theme-mode"
          value={themeMode}
          onChange={handleThemeModeChange}
        >
          {THEME_OPTIONS.map(({ value, label, ariaLabel }) => (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio />}
              label={label}
              aria-label={ariaLabel}
            />
          ))}
        </RadioGroup>

        <FormControlLabel
          control={
            <Switch
              checked={isSystemTheme}
              onChange={(e) => handleThemeModeChange({
                ...e,
                target: { ...e.target, value: ThemeMode.SYSTEM }
              } as React.ChangeEvent<HTMLInputElement>)}
              disabled={disabled}
              aria-label="Use system theme preference"
            />
          }
          label="Follow system theme"
          sx={{ mt: 2 }}
        />

        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{ mt: 2 }}
        >
          Choose your preferred theme mode or let the system decide based on your device settings.
        </Typography>
      </StyledFormControl>
    </ErrorBoundary>
  );
});

ThemeSettings.displayName = 'ThemeSettings';

export default ThemeSettings;

/**
 * Type export for component props
 */
export type { ThemeSettingsProps };