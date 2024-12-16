// @version react@18.x
import { useState, useEffect } from 'react';

/**
 * A custom hook that provides debounced value updates to prevent excessive re-renders and API calls.
 * Implements generic type system for maximum flexibility and includes proper cleanup handling.
 * 
 * @template T - The type of value being debounced
 * @param {T} value - The value to be debounced
 * @param {number} delay - The delay in milliseconds before the value should update
 * @returns {T} The debounced value
 * 
 * @example
 * ```tsx
 * const searchTerm = 'example';
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * ```
 */
function useDebounce<T>(value: T, delay: number): T {
  // Store the debounced value in state
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Validate delay parameter
    if (delay < 0) {
      console.warn('useDebounce: delay parameter should be a positive number');
      return;
    }

    // Create a timeout to update the debounced value after the specified delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear the timeout if value changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]); // Only re-run effect if value or delay changes

  return debouncedValue;
}

export default useDebounce;