// @reduxjs/toolkit version 1.9.x
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeMode, ThemeState, isThemeMode } from '../types/theme.types';
import { THEME_MODES, TRANSITIONS } from '../constants/theme.constants';

// Constants for theme management
const THEME_STORAGE_KEY = 'app_theme_preference';
const THEME_TRANSITION_DURATION = parseInt(TRANSITIONS.duration.standard);
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Initial state for theme management
 * Defaults to system preference with fallback to light theme
 */
const initialState: ThemeState = {
  userPreference: ThemeMode.SYSTEM,
  systemPreference: ThemeMode.LIGHT,
  activeTheme: ThemeMode.LIGHT,
};

/**
 * Memoized function to calculate the active theme based on preferences
 * @param userPreference - User's selected theme preference
 * @param systemPreference - System theme preference
 * @returns The active theme to be applied
 */
const calculateActiveTheme = (
  userPreference: ThemeMode,
  systemPreference: ThemeMode
): ThemeMode => {
  if (!isThemeMode(userPreference) || !isThemeMode(systemPreference)) {
    return THEME_MODES.LIGHT;
  }

  if (userPreference === THEME_MODES.SYSTEM) {
    return systemPreference;
  }

  return userPreference;
};

/**
 * Handles smooth theme transitions with accessibility considerations
 * @param currentTheme - Currently active theme
 * @param newTheme - Theme to transition to
 */
const handleThemeTransition = async (
  currentTheme: ThemeMode,
  newTheme: ThemeMode
): Promise<void> => {
  // Skip transitions if reduced motion is preferred
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    document.documentElement.classList.remove(currentTheme);
    document.documentElement.classList.add(newTheme);
    return;
  }

  // Apply transition class
  document.documentElement.classList.add('theme-transition');
  
  // Wait for next frame to ensure transition class is applied
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  // Update theme
  document.documentElement.classList.remove(currentTheme);
  document.documentElement.classList.add(newTheme);

  // Remove transition class after duration
  await new Promise(resolve => 
    setTimeout(resolve, THEME_TRANSITION_DURATION)
  );
  
  document.documentElement.classList.remove('theme-transition');
};

/**
 * Theme slice for managing application theme state
 */
export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Sets the user's theme preference and persists it to storage
     */
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      if (!isThemeMode(action.payload)) {
        return;
      }

      state.userPreference = action.payload;
      state.activeTheme = calculateActiveTheme(
        action.payload,
        state.systemPreference
      );

      // Persist theme preference
      try {
        localStorage.setItem(THEME_STORAGE_KEY, action.payload);
      } catch (error) {
        console.error('Failed to persist theme preference:', error);
      }
    },

    /**
     * Updates the detected system theme preference
     */
    setSystemPreference: (state, action: PayloadAction<ThemeMode>) => {
      if (!isThemeMode(action.payload)) {
        return;
      }

      state.systemPreference = action.payload;
      
      // Update active theme if using system preference
      if (state.userPreference === THEME_MODES.SYSTEM) {
        state.activeTheme = action.payload;
      }
    },

    /**
     * Resets theme to system default
     */
    resetTheme: (state) => {
      state.userPreference = THEME_MODES.SYSTEM;
      state.activeTheme = state.systemPreference;
      
      try {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear theme preference:', error);
      }
    },
  },
});

// Export actions and reducer
export const {
  setThemeMode,
  setSystemPreference,
  resetTheme,
} = themeSlice.actions;

export default themeSlice.reducer;

/**
 * Theme manager class for handling theme initialization and system preference detection
 */
export class ThemeManager {
  private systemThemeQuery: MediaQueryList;

  constructor() {
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  /**
   * Initializes theme system with error recovery
   */
  async initialize(dispatch: Function): Promise<void> {
    try {
      // Load persisted theme preference
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
      if (storedTheme && isThemeMode(storedTheme)) {
        dispatch(setThemeMode(storedTheme));
      }

      // Detect system theme preference
      const systemTheme = this.systemThemeQuery.matches 
        ? THEME_MODES.DARK 
        : THEME_MODES.LIGHT;
      dispatch(setSystemPreference(systemTheme));

      // Listen for system theme changes
      this.systemThemeQuery.addEventListener('change', (e) => {
        dispatch(setSystemPreference(
          e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT
        ));
      });

    } catch (error) {
      console.error('Theme initialization failed:', error);
      // Fallback to light theme
      dispatch(setThemeMode(THEME_MODES.LIGHT));
    }
  }

  /**
   * Cleanup theme manager
   */
  cleanup(): void {
    this.systemThemeQuery.removeEventListener('change', () => {});
  }
}