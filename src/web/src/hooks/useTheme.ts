// @mui/material version 5.x
// react-redux version 8.x
// react version 18.x

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { ThemeMode, ThemeState } from '../types/theme.types';
import { THEME_MODES } from '../constants/theme.constants';
import { 
  detectSystemTheme, 
  saveThemePreference, 
  calculateActiveTheme 
} from '../utils/theme.utils';

/**
 * Interface defining the return type of the useTheme hook
 */
interface ThemeHookReturn {
  themeMode: ThemeMode;
  userPreference: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isSystemTheme: boolean;
  isThemeChanging: boolean;
  themeError: Error | null;
}

/**
 * Custom hook for managing application theme state with error handling,
 * system preference detection, and performance optimization.
 * 
 * @returns {ThemeHookReturn} Theme state and control functions
 */
const useTheme = (): ThemeHookReturn => {
  // Initialize error state
  const errorRef = useRef<Error | null>(null);
  
  // Redux hooks for state management
  const dispatch = useDispatch();
  const themeState = useSelector((state: { theme: ThemeState }) => state.theme);
  
  // Theme transition state
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  
  // System theme detection with performance optimization
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', {
    noSsr: true // Disable server-side rendering for this query
  });
  
  // Memoized system theme calculation
  const systemTheme = useMemo(() => {
    try {
      return prefersDarkMode ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    } catch (error) {
      errorRef.current = error as Error;
      return THEME_MODES.LIGHT; // Safe fallback
    }
  }, [prefersDarkMode]);

  // Memoized active theme calculation
  const activeTheme = useMemo(() => {
    try {
      return calculateActiveTheme({
        ...themeState,
        systemPreference: systemTheme
      });
    } catch (error) {
      errorRef.current = error as Error;
      return THEME_MODES.LIGHT; // Safe fallback
    }
  }, [themeState, systemTheme]);

  // Theme change handler with debouncing
  const setThemeMode = useCallback((mode: ThemeMode) => {
    try {
      setIsThemeChanging(true);
      
      // Dispatch theme change action
      dispatch({
        type: 'theme/setUserPreference',
        payload: mode
      });

      // Persist theme preference
      saveThemePreference(mode);

      // Announce theme change for screen readers
      const announcement = `Theme changed to ${mode} mode`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('role', 'status');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      
      // Cleanup announcement
      setTimeout(() => {
        document.body.removeChild(ariaLive);
        setIsThemeChanging(false);
      }, 1000);

    } catch (error) {
      errorRef.current = error as Error;
      setIsThemeChanging(false);
    }
  }, [dispatch]);

  // System theme change listener
  useEffect(() => {
    const handleSystemThemeChange = () => {
      if (themeState.userPreference === THEME_MODES.SYSTEM) {
        dispatch({
          type: 'theme/setSystemPreference',
          payload: systemTheme
        });
      }
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(handleSystemThemeChange);

    // Cleanup listener
    return () => {
      mediaQuery.removeListener(handleSystemThemeChange);
    };
  }, [dispatch, systemTheme, themeState.userPreference]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'habit-tracker-theme-preference') {
        const newTheme = event.newValue as ThemeMode;
        if (newTheme && newTheme !== themeState.userPreference) {
          dispatch({
            type: 'theme/setUserPreference',
            payload: newTheme
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch, themeState.userPreference]);

  // Performance optimization for theme calculations
  const isSystemTheme = useMemo(() => 
    themeState.userPreference === THEME_MODES.SYSTEM,
    [themeState.userPreference]
  );

  return {
    themeMode: activeTheme,
    userPreference: themeState.userPreference,
    setThemeMode,
    isSystemTheme,
    isThemeChanging,
    themeError: errorRef.current
  };
};

export default useTheme;