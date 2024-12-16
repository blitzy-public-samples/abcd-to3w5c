// @mui/material version 5.x
import { PaletteColor } from '@mui/material';
import { ThemeMode, ThemeColors, ThemeTypography } from '../types/theme.types';

/**
 * Available theme modes with system preference detection support
 */
export const THEME_MODES = {
  LIGHT: ThemeMode.LIGHT,
  DARK: ThemeMode.DARK,
  SYSTEM: ThemeMode.SYSTEM,
} as const;

/**
 * Light theme color palette with WCAG 2.1 AA compliant contrast ratios
 */
export const LIGHT_THEME_COLORS: ThemeColors = {
  primary: {
    main: '#2563eb', // Blue 600
    light: '#60a5fa', // Blue 400
    dark: '#1d4ed8', // Blue 700
    contrastText: '#ffffff',
  } as PaletteColor,
  secondary: {
    main: '#7c3aed', // Violet 600
    light: '#a78bfa', // Violet 400
    dark: '#6d28d9', // Violet 700
    contrastText: '#ffffff',
  } as PaletteColor,
  error: {
    main: '#dc2626', // Red 600
    light: '#f87171', // Red 400
    dark: '#b91c1c', // Red 700
    contrastText: '#ffffff',
  } as PaletteColor,
  success: {
    main: '#16a34a', // Green 600
    light: '#4ade80', // Green 400
    dark: '#15803d', // Green 700
    contrastText: '#ffffff',
  } as PaletteColor,
  warning: {
    main: '#d97706', // Amber 600
    light: '#fbbf24', // Amber 400
    dark: '#b45309', // Amber 700
    contrastText: '#000000',
  } as PaletteColor,
  info: {
    main: '#0284c7', // Sky 600
    light: '#38bdf8', // Sky 400
    dark: '#0369a1', // Sky 700
    contrastText: '#ffffff',
  } as PaletteColor,
  background: {
    default: '#ffffff',
    paper: '#f8fafc', // Slate 50
    surface: '#f1f5f9', // Slate 100
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

/**
 * Dark theme color palette with optimized contrast and reduced eye strain
 */
export const DARK_THEME_COLORS: ThemeColors = {
  primary: {
    main: '#60a5fa', // Blue 400
    light: '#93c5fd', // Blue 300
    dark: '#3b82f6', // Blue 500
    contrastText: '#000000',
  } as PaletteColor,
  secondary: {
    main: '#a78bfa', // Violet 400
    light: '#c4b5fd', // Violet 300
    dark: '#8b5cf6', // Violet 500
    contrastText: '#000000',
  } as PaletteColor,
  error: {
    main: '#f87171', // Red 400
    light: '#fca5a5', // Red 300
    dark: '#ef4444', // Red 500
    contrastText: '#000000',
  } as PaletteColor,
  success: {
    main: '#4ade80', // Green 400
    light: '#86efac', // Green 300
    dark: '#22c55e', // Green 500
    contrastText: '#000000',
  } as PaletteColor,
  warning: {
    main: '#fbbf24', // Amber 400
    light: '#fcd34d', // Amber 300
    dark: '#f59e0b', // Amber 500
    contrastText: '#000000',
  } as PaletteColor,
  info: {
    main: '#38bdf8', // Sky 400
    light: '#7dd3fc', // Sky 300
    dark: '#0ea5e9', // Sky 500
    contrastText: '#000000',
  } as PaletteColor,
  background: {
    default: '#0f172a', // Slate 900
    paper: '#1e293b', // Slate 800
    surface: '#334155', // Slate 700
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
};

/**
 * Typography system with fluid scaling and responsive behavior
 */
export const TYPOGRAPHY: ThemeTypography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: {
    xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',     // 12px - 14px
    sm: 'clamp(0.875rem, 0.825rem + 0.25vw, 1rem)',      // 14px - 16px
    base: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',     // 16px - 18px
    lg: 'clamp(1.125rem, 1.075rem + 0.25vw, 1.25rem)',   // 18px - 20px
    xl: 'clamp(1.25rem, 1.2rem + 0.25vw, 1.5rem)',       // 20px - 24px
    '2xl': 'clamp(1.5rem, 1.45rem + 0.25vw, 1.875rem)',  // 24px - 30px
    '3xl': 'clamp(1.875rem, 1.825rem + 0.25vw, 2.25rem)', // 30px - 36px
    '4xl': 'clamp(2.25rem, 2.2rem + 0.25vw, 3rem)',      // 36px - 48px
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

/**
 * Responsive breakpoints following mobile-first approach
 */
export const BREAKPOINTS = {
  xs: '320px',
  sm: '768px',
  md: '1024px',
  lg: '1440px',
} as const;

/**
 * Consistent spacing units based on 8px grid
 */
export const SPACING = {
  unit: '8px',
  small: '8px',
  medium: '16px',
  large: '24px',
  xlarge: '32px',
} as const;

/**
 * Border radius tokens for consistent component shapes
 */
export const BORDER_RADIUS = {
  small: '4px',
  medium: '8px',
  large: '12px',
  pill: '9999px',
} as const;

/**
 * Animation timing and easing functions
 */
export const TRANSITIONS = {
  duration: {
    shortest: '150ms',
    shorter: '200ms',
    short: '250ms',
    standard: '300ms',
    complex: '375ms',
    enteringScreen: '225ms',
    leavingScreen: '195ms',
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
} as const;

/**
 * Elevation shadows with consistent depth levels
 */
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
} as const;