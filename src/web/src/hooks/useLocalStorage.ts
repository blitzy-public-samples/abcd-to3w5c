/**
 * @fileoverview Custom React hook for type-safe local storage operations with cross-tab synchronization
 * Supports the application's offline-first PWA capabilities and persistent data storage
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'; // v18.x
import { getLocalStorageItem, setLocalStorageItem } from '../utils/storage.utils';

/**
 * Error messages for the useLocalStorage hook
 */
const HOOK_ERRORS = {
  INVALID_KEY: 'Storage key must be a non-empty string',
  SYNC_ERROR: 'Error synchronizing storage across tabs',
  STATE_UPDATE: 'Error updating storage state',
} as const;

/**
 * Type guard to validate storage key format
 * @param key - The key to validate
 */
const isValidStorageKey = (key: string): boolean => {
  return typeof key === 'string' && key.trim().length > 0;
};

/**
 * Custom hook for managing state in local storage with type safety and cross-tab synchronization
 * @template T - The type of the stored value
 * @param key - The storage key
 * @param initialValue - The initial value to use if no value exists in storage
 * @returns A tuple containing the stored value, setter function, and clear function
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void] {
  // Validate key format
  if (!isValidStorageKey(key)) {
    throw new Error(HOOK_ERRORS.INVALID_KEY);
  }

  // Initialize state with value from localStorage or fall back to initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getLocalStorageItem<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error('Error initializing storage value:', error);
      return initialValue;
    }
  });

  /**
   * Memoized function to update the stored value
   * Handles both state update and storage synchronization
   */
  const setValue = useCallback((value: T) => {
    try {
      // Update React state
      setStoredValue(value);
      
      // Update localStorage and trigger cross-tab sync
      const success = setLocalStorageItem(key, value);
      
      if (!success) {
        console.warn('Failed to persist value to localStorage');
      }
    } catch (error) {
      console.error(HOOK_ERRORS.STATE_UPDATE, error);
    }
  }, [key]);

  /**
   * Memoized function to clear the stored value
   * Resets to initial value and removes from storage
   */
  const clearValue = useCallback(() => {
    try {
      // Reset to initial value
      setStoredValue(initialValue);
      
      // Clear from localStorage and trigger cross-tab sync
      setLocalStorageItem(key, null);
    } catch (error) {
      console.error('Error clearing storage value:', error);
    }
  }, [key, initialValue]);

  /**
   * Effect to handle storage events for cross-tab synchronization
   * Updates local state when changes occur in other tabs
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      try {
        if (event.key === key && event.newValue !== null) {
          const newValue = JSON.parse(event.newValue) as T;
          setStoredValue(newValue);
        } else if (event.key === key && event.newValue === null) {
          setStoredValue(initialValue);
        }
      } catch (error) {
        console.error(HOOK_ERRORS.SYNC_ERROR, error);
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
}

export default useLocalStorage;
```

This implementation provides a robust and type-safe local storage hook with the following features:

1. Type Safety:
- Uses TypeScript generics to ensure type safety for stored values
- Implements type guards for key validation
- Integrates with the application's type system

2. Cross-Tab Synchronization:
- Listens for storage events to sync state across browser tabs
- Handles both value updates and clearing operations
- Maintains consistency across multiple instances

3. Error Handling:
- Comprehensive error handling for all storage operations
- Detailed error messages for debugging
- Graceful fallback to initial values on errors

4. Performance:
- Uses useCallback for memoized functions
- Efficient event listener management
- Optimized storage operations

5. PWA Support:
- Compatible with offline-first architecture
- Persistent storage for offline capabilities
- Reliable state management across sessions

The hook follows the technical specifications for:
- Cross-Platform capabilities (PWA support)
- Theme Support (persistent storage)
- Data Storage (client-side caching)
- Type Safety (TypeScript implementation)

Usage example:
```typescript
// Store theme preferences
const [theme, setTheme, clearTheme] = useLocalStorage<ThemeState>('theme', {
  userPreference: ThemeMode.SYSTEM,
  systemPreference: ThemeMode.LIGHT,
  activeTheme: ThemeMode.LIGHT
});

// Store user habits
const [habits, setHabits, clearHabits] = useLocalStorage<Habit[]>('habits', []);