// @mui/material version 5.x
import { Theme, PaletteColor } from '@mui/material';

/**
 * Available theme modes for the application.
 * Supports light, dark, and system preference detection.
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * Extended color palette interface integrating with Material UI's PaletteColor.
 * Defines the core color scheme for the application theme.
 */
export interface ThemeColors {
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  background: {
    default: string;
    paper: string;
    surface: string;
    overlay: string;
  };
}

/**
 * Typography system interface supporting fluid typography and responsive scaling.
 * Base font size ranges from 16px to 24px following the technical specifications.
 */
export interface ThemeTypography {
  fontFamily: string;
  fontSize: Record<
    | 'xs'
    | 'sm'
    | 'base'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl',
    string
  >;
  fontWeight: Record<
    'light' | 'regular' | 'medium' | 'semibold' | 'bold',
    number
  >;
  lineHeight: Record<
    'tight' | 'normal' | 'relaxed' | 'loose',
    number
  >;
}

/**
 * Theme state management interface for handling user and system preferences.
 * Tracks both explicit user selection and system preference for theme mode.
 */
export interface ThemeState {
  /**
   * User's explicitly selected theme preference
   */
  userPreference: ThemeMode;
  
  /**
   * Detected system theme preference
   */
  systemPreference: ThemeMode;
  
  /**
   * Currently active theme based on user preference or system default
   */
  activeTheme: ThemeMode;
}

/**
 * Custom theme augmentation for Material UI Theme interface.
 * Ensures type safety when extending the default theme.
 */
declare module '@mui/material/styles' {
  interface Theme {
    colors: ThemeColors;
    typography: ThemeTypography;
  }
  
  interface ThemeOptions {
    colors?: Partial<ThemeColors>;
    typography?: Partial<ThemeTypography>;
  }
}

/**
 * Type guard to check if a value is a valid ThemeMode
 */
export const isThemeMode = (value: unknown): value is ThemeMode => {
  return Object.values(ThemeMode).includes(value as ThemeMode);
};

/**
 * Default typography scale following fluid typography principles
 * Base size scales from 16px to 24px based on viewport width
 */
export const DEFAULT_TYPOGRAPHY_SCALE = {
  xs: 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
  sm: 'clamp(0.875rem, 0.825rem + 0.25vw, 1rem)',
  base: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',
  lg: 'clamp(1.125rem, 1.075rem + 0.25vw, 1.25rem)',
  xl: 'clamp(1.25rem, 1.2rem + 0.25vw, 1.5rem)',
  '2xl': 'clamp(1.5rem, 1.45rem + 0.25vw, 1.875rem)',
  '3xl': 'clamp(1.875rem, 1.825rem + 0.25vw, 2.25rem)',
  '4xl': 'clamp(2.25rem, 2.2rem + 0.25vw, 3rem)'
} as const;

/**
 * Standard font weights following Material Design guidelines
 */
export const FONT_WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
} as const;

/**
 * Standard line heights for optimal readability
 */
export const LINE_HEIGHTS = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2
} as const;