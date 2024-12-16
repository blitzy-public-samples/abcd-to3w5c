/**
 * @fileoverview Type-safe local storage utility functions for the Habit Tracking Application
 * Supports offline-first PWA capabilities and cross-tab synchronization
 * @version 1.0.0
 */

import { ThemeState } from '../types';

// Storage namespace prefix to avoid conflicts with other applications
const STORAGE_PREFIX = 'habit_tracker_';

/**
 * Error messages for storage operations
 */
const STORAGE_ERRORS = {
  QUOTA_EXCEEDED: 'Storage quota exceeded',
  INVALID_JSON: 'Invalid JSON data structure',
  TYPE_MISMATCH: 'Data type mismatch',
  STORAGE_UNAVAILABLE: 'Local storage is not available',
} as const;

/**
 * Type guard to check if the parsed data matches the expected structure
 * @param data - The data to validate
 * @param expectedType - Name of the expected type for error messaging
 */
const isValidDataStructure = <T>(data: unknown, expectedType: string): data is T => {
  if (!data || typeof data !== 'object') return false;

  // Add specific type validations for known types
  if (expectedType === 'ThemeState') {
    const themeState = data as ThemeState;
    return (
      'userPreference' in themeState &&
      'systemPreference' in themeState &&
      'activeTheme' in themeState
    );
  }

  return true;
};

/**
 * Checks if localStorage is available and functioning
 * @throws Error if localStorage is not available
 */
const validateStorageAvailability = (): void => {
  try {
    const testKey = `${STORAGE_PREFIX}test`;
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
  } catch (error) {
    throw new Error(STORAGE_ERRORS.STORAGE_UNAVAILABLE);
  }
};

/**
 * Retrieves a typed item from localStorage with comprehensive error handling
 * @template T - The expected type of the stored value
 * @param key - The storage key
 * @returns The stored value with type T or null if not found or on error
 */
export const getLocalStorageItem = <T>(key: string): T | null => {
  try {
    validateStorageAvailability();
    
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const storedValue = localStorage.getItem(prefixedKey);
    
    if (!storedValue) return null;
    
    const parsedValue = JSON.parse(storedValue);
    
    if (!isValidDataStructure<T>(parsedValue, key)) {
      console.error(STORAGE_ERRORS.TYPE_MISMATCH, { key, value: parsedValue });
      return null;
    }
    
    return parsedValue as T;
  } catch (error) {
    console.error('Error retrieving from localStorage:', error);
    return null;
  }
};

/**
 * Stores a typed item in localStorage with quota handling and error management
 * @template T - The type of the value to store
 * @param key - The storage key
 * @param value - The value to store
 * @returns Success status of the storage operation
 */
export const setLocalStorageItem = <T>(key: string, value: T): boolean => {
  try {
    validateStorageAvailability();
    
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    const serializedValue = JSON.stringify(value);
    
    // Check if the value is too large before attempting to store
    const estimatedSize = serializedValue.length * 2; // UTF-16 characters
    if (estimatedSize > 5242880) { // 5MB limit
      throw new Error(STORAGE_ERRORS.QUOTA_EXCEEDED);
    }
    
    localStorage.setItem(prefixedKey, serializedValue);
    
    // Dispatch storage event for cross-tab synchronization
    window.dispatchEvent(new StorageEvent('storage', {
      key: prefixedKey,
      newValue: serializedValue,
      storageArea: localStorage
    }));
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error setting localStorage item:', {
        key,
        error: error.message,
        value
      });
      
      // Handle specific quota exceeded error
      if (error.name === 'QuotaExceededError' || 
          error.message.includes('quota') || 
          error.message === STORAGE_ERRORS.QUOTA_EXCEEDED) {
        // Attempt to clear old data or notify user
        console.warn('Storage quota exceeded. Consider clearing old data.');
      }
    }
    return false;
  }
};

/**
 * Removes an item from localStorage with cross-tab synchronization
 * @param key - The storage key
 */
export const removeLocalStorageItem = (key: string): void => {
  try {
    validateStorageAvailability();
    
    const prefixedKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(prefixedKey);
    
    // Dispatch storage event for cross-tab synchronization
    window.dispatchEvent(new StorageEvent('storage', {
      key: prefixedKey,
      newValue: null,
      storageArea: localStorage
    }));
  } catch (error) {
    console.error('Error removing localStorage item:', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Utility type for storage operations that maintains type safety
 * @template T - The type of value being stored
 */
type StorageOperation<T> = {
  get: () => T | null;
  set: (value: T) => boolean;
  remove: () => void;
};

/**
 * Creates a typed storage operation object for a specific key
 * @template T - The type of value being stored
 * @param key - The storage key
 * @returns Object with typed storage operations
 */
export const createTypedStorage = <T>(key: string): StorageOperation<T> => ({
  get: () => getLocalStorageItem<T>(key),
  set: (value: T) => setLocalStorageItem<T>(key, value),
  remove: () => removeLocalStorageItem(key)
});