// @mui/material version 5.x
import { createTheme, Theme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';
import {
  ThemeMode,
  ThemeColors,
  ThemeTypography,
  ThemeState
} from '../types/theme.types';
import {
  THEME_MODES,
  LIGHT_THEME_COLORS,
  DARK_THEME_COLORS,
  TYPOGRAPHY,
  BREAKPOINTS,
  SPACING,
  BORDER_RADIUS,
  TRANSITIONS,
  SHADOWS
} from '../constants/theme.constants';

/**
 * Component style overrides with accessibility enhancements
 * Ensures WCAG 2.1 Level AA compliance for all interactive elements
 */
const COMPONENT_OVERRIDES = {
  MuiButton: {
    styleOverrides: {
      root: {
        minHeight: '44px', // Touch target size
        minWidth: '44px',
        padding: '8px 16px',
        '&:focus-visible': {
          outline: '2px solid currentColor',
          outlineOffset: '2px',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiInputBase-root': {
          minHeight: '44px', // Touch target size
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'currentColor',
        },
        '& .MuiOutlinedInput-root': {
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '2px',
          },
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        fontSize: '0.875rem',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)', // Ensures readable contrast
      },
    },
    defaultProps: {
      enterTouchDelay: 700,
      leaveTouchDelay: 1500,
    },
  },
  MuiDialog: {
    styleOverrides: {
      root: {
        '& .MuiDialog-paper': {
          margin: '16px',
          width: 'calc(100% - 32px)',
          maxHeight: 'calc(100% - 32px)',
        },
      },
    },
    defaultProps: {
      closeAfterTransition: true,
      disableScrollLock: false,
    },
  },
};

/**
 * Creates an accessible Material UI theme configuration for light mode
 * with WCAG 2.1 Level AA compliance
 */
export const createLightTheme = (): Theme => {
  return useMemo(() => createTheme({
    palette: {
      mode: 'light',
      primary: LIGHT_THEME_COLORS.primary,
      secondary: LIGHT_THEME_COLORS.secondary,
      error: LIGHT_THEME_COLORS.error,
      background: LIGHT_THEME_COLORS.background,
      // Ensure text contrast meets WCAG AA standards
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
      },
    },
    typography: {
      fontFamily: TYPOGRAPHY.fontFamily,
      // Apply fluid typography scaling
      fontSize: parseInt(TYPOGRAPHY.fontSize.base),
      fontWeightLight: TYPOGRAPHY.fontWeight.light,
      fontWeightRegular: TYPOGRAPHY.fontWeight.regular,
      fontWeightMedium: TYPOGRAPHY.fontWeight.medium,
      fontWeightBold: TYPOGRAPHY.fontWeight.bold,
    },
    spacing: (factor: number) => `${factor * parseInt(SPACING.unit)}px`,
    shape: {
      borderRadius: parseInt(BORDER_RADIUS.medium),
    },
    transitions: {
      duration: TRANSITIONS.duration,
      easing: TRANSITIONS.easing,
    },
    shadows: [SHADOWS.none, SHADOWS.sm, SHADOWS.md, SHADOWS.lg],
    components: COMPONENT_OVERRIDES,
    // Custom theme extensions
    colors: LIGHT_THEME_COLORS,
  }), []);
};

/**
 * Creates an accessible Material UI theme configuration for dark mode
 * with WCAG 2.1 Level AA compliance and reduced eye strain
 */
export const createDarkTheme = (): Theme => {
  return useMemo(() => createTheme({
    palette: {
      mode: 'dark',
      primary: DARK_THEME_COLORS.primary,
      secondary: DARK_THEME_COLORS.secondary,
      error: DARK_THEME_COLORS.error,
      background: DARK_THEME_COLORS.background,
      // Ensure text contrast meets WCAG AA standards
      text: {
        primary: 'rgba(255, 255, 255, 0.87)',
        secondary: 'rgba(255, 255, 255, 0.6)',
      },
    },
    typography: {
      fontFamily: TYPOGRAPHY.fontFamily,
      fontSize: parseInt(TYPOGRAPHY.fontSize.base),
      fontWeightLight: TYPOGRAPHY.fontWeight.light,
      fontWeightRegular: TYPOGRAPHY.fontWeight.regular,
      fontWeightMedium: TYPOGRAPHY.fontWeight.medium,
      fontWeightBold: TYPOGRAPHY.fontWeight.bold,
    },
    spacing: (factor: number) => `${factor * parseInt(SPACING.unit)}px`,
    shape: {
      borderRadius: parseInt(BORDER_RADIUS.medium),
    },
    transitions: {
      duration: TRANSITIONS.duration,
      easing: TRANSITIONS.easing,
    },
    shadows: [SHADOWS.none, SHADOWS.sm, SHADOWS.md, SHADOWS.lg],
    components: COMPONENT_OVERRIDES,
    // Custom theme extensions
    colors: DARK_THEME_COLORS,
  }), []);
};

/**
 * Determines and returns the active theme based on user preferences
 * and system settings with fallback support
 */
export const getActiveTheme = (themeState: ThemeState): Theme => {
  // Use system preference detection hook
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return useMemo(() => {
    let activeMode = themeState.userPreference;

    // Handle system preference when in system mode
    if (activeMode === THEME_MODES.SYSTEM) {
      activeMode = prefersDarkMode ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    }

    // Fallback to light theme if preference detection fails
    if (!Object.values(THEME_MODES).includes(activeMode)) {
      activeMode = THEME_MODES.LIGHT;
    }

    // Return appropriate theme based on determined mode
    return activeMode === THEME_MODES.DARK
      ? createDarkTheme()
      : createLightTheme();
  }, [themeState.userPreference, prefersDarkMode]);
};