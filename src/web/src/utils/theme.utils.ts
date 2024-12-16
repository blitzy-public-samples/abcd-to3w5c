// @mui/material version 5.x
import { useMediaQuery } from '@mui/material';
import { ThemeMode, ThemeState } from '../types/theme.types';
import { THEME_MODES } from '../constants/theme.constants';

// Storage key for theme preference
const THEME_STORAGE_KEY = 'habit-tracker-theme-preference';

/**
 * Detects the system's theme preference using media query
 * Falls back to light theme if detection fails
 * @returns {ThemeMode} Detected system theme mode
 */
export const detectSystemTheme = (): ThemeMode => {
  try {
    // Use matchMedia to detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    return prefersDark.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
  } catch (error) {
    // Log error for monitoring but don't expose to user
    console.error('Error detecting system theme:', error);
    // Fallback to light theme for safety
    return THEME_MODES.LIGHT;
  }
};

/**
 * Validates and sanitizes theme mode value
 * @param {unknown} value - Value to validate
 * @returns {boolean} Whether the value is a valid theme mode
 */
const isValidThemeMode = (value: unknown): value is ThemeMode => {
  return Object.values(THEME_MODES).includes(value as ThemeMode);
};

/**
 * Saves the user's theme preference to local storage
 * Implements validation and error handling
 * @param {ThemeMode} themeMode - Theme mode to save
 */
export const saveThemePreference = (themeMode: ThemeMode): void => {
  try {
    // Validate theme mode before saving
    if (!isValidThemeMode(themeMode)) {
      throw new Error(`Invalid theme mode: ${themeMode}`);
    }

    // Save to localStorage with error handling
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);

    // Dispatch storage event for cross-tab synchronization
    window.dispatchEvent(new StorageEvent('storage', {
      key: THEME_STORAGE_KEY,
      newValue: themeMode
    }));
  } catch (error) {
    // Log storage errors but don't break the application
    console.error('Error saving theme preference:', error);
    
    // Attempt to clear potentially corrupted data
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch (clearError) {
      console.error('Error clearing theme storage:', clearError);
    }
  }
};

/**
 * Retrieves and validates the stored theme preference
 * Implements fallback handling for invalid or missing data
 * @returns {ThemeMode} Validated theme preference or system default
 */
export const getStoredThemePreference = (): ThemeMode => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    // Return system preference if no stored value
    if (!storedTheme) {
      return THEME_MODES.SYSTEM;
    }

    // Validate stored value
    if (isValidThemeMode(storedTheme)) {
      return storedTheme;
    } else {
      // Clear invalid data and return default
      localStorage.removeItem(THEME_STORAGE_KEY);
      return THEME_MODES.SYSTEM;
    }
  } catch (error) {
    // Log error and return safe default
    console.error('Error retrieving theme preference:', error);
    return THEME_MODES.SYSTEM;
  }
};

/**
 * Calculates the active theme based on user preference and system settings
 * Implements comprehensive validation and fallback handling
 * @param {ThemeState} themeState - Current theme state
 * @returns {ThemeMode} Calculated active theme mode
 */
export const calculateActiveTheme = (themeState: ThemeState): ThemeMode => {
  try {
    // Validate theme state object
    if (!themeState || typeof themeState !== 'object') {
      throw new Error('Invalid theme state');
    }

    const { userPreference, systemPreference } = themeState;

    // Validate user preference
    if (!isValidThemeMode(userPreference)) {
      throw new Error('Invalid user preference');
    }

    // If user explicitly chose light or dark, respect that choice
    if (userPreference === THEME_MODES.LIGHT || userPreference === THEME_MODES.DARK) {
      return userPreference;
    }

    // For system preference, validate and use system theme
    if (userPreference === THEME_MODES.SYSTEM) {
      // Validate system preference
      if (!isValidThemeMode(systemPreference)) {
        // If system preference is invalid, detect it again
        return detectSystemTheme();
      }
      return systemPreference;
    }

    // Fallback to light theme for any unexpected cases
    return THEME_MODES.LIGHT;
  } catch (error) {
    // Log error and return safe default
    console.error('Error calculating active theme:', error);
    return THEME_MODES.LIGHT;
  }
};