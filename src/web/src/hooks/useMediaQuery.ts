import { useState, useEffect, useCallback } from 'react'; // React 18.x
import { BREAKPOINTS } from '../constants/theme.constants';

/**
 * Type definition for media query hook parameters
 */
interface MediaQueryProps {
  query: string;
}

/**
 * Type definition for media query hook return value
 */
interface MediaQueryResult {
  matches: boolean;
  error: Error | null;
}

/**
 * Default values and constants
 */
const DEFAULT_MEDIA_QUERY = `screen and (min-width: ${BREAKPOINTS.sm})`;
const DEBOUNCE_DELAY = 150;
const SSR_FALLBACK_VALUE = false;

/**
 * Custom hook that provides responsive design functionality by tracking
 * media query matches for different screen sizes and device capabilities.
 * 
 * Features:
 * - TypeScript support for type safety
 * - Performance optimization with debouncing
 * - SSR compatibility with fallback values
 * - Error boundary for graceful failure
 * - Memory leak prevention with proper cleanup
 * 
 * @param {string} query - CSS media query string (defaults to tablet breakpoint)
 * @returns {MediaQueryResult} Object containing match status and potential error
 */
const useMediaQuery = ({ query = DEFAULT_MEDIA_QUERY }: MediaQueryProps): MediaQueryResult => {
  // Initialize state for match status and error handling
  const [matches, setMatches] = useState<boolean>(SSR_FALLBACK_VALUE);
  const [error, setError] = useState<Error | null>(null);

  // Memoized handler for media query changes
  const handleChange = useCallback((event: MediaQueryListEvent): void => {
    setMatches(event.matches);
  }, []);

  useEffect(() => {
    // Reset error state on new query
    setError(null);

    // Check for SSR environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Validate query string format
      if (typeof query !== 'string' || query.trim() === '') {
        throw new Error('Invalid media query string provided');
      }

      // Create MediaQueryList object
      const mediaQueryList = window.matchMedia(query);
      
      // Set initial match status
      setMatches(mediaQueryList.matches);

      // Create debounced event handler
      let debounceTimeout: NodeJS.Timeout;
      const debouncedHandler = (event: MediaQueryListEvent) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          handleChange(event);
        }, DEBOUNCE_DELAY);
      };

      // Add event listener with modern API
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', debouncedHandler);
      } else {
        // Fallback for older browsers
        mediaQueryList.addListener(debouncedHandler as any);
      }

      // Cleanup function
      return () => {
        clearTimeout(debounceTimeout);
        if (mediaQueryList.removeEventListener) {
          mediaQueryList.removeEventListener('change', debouncedHandler);
        } else {
          // Fallback for older browsers
          mediaQueryList.removeListener(debouncedHandler as any);
        }
      };
    } catch (err) {
      // Handle and store any errors that occur
      const error = err instanceof Error ? err : new Error('An error occurred in useMediaQuery');
      setError(error);
      // Return fallback value on error
      setMatches(SSR_FALLBACK_VALUE);
    }
  }, [query, handleChange]);

  return { matches, error };
};

/**
 * Predefined media query hooks for common breakpoints
 */
export const useIsMobile = (): MediaQueryResult => 
  useMediaQuery({ query: `screen and (max-width: ${BREAKPOINTS.sm})` });

export const useIsTablet = (): MediaQueryResult => 
  useMediaQuery({ query: `screen and (min-width: ${BREAKPOINTS.sm}) and (max-width: ${BREAKPOINTS.md})` });

export const useIsDesktop = (): MediaQueryResult => 
  useMediaQuery({ query: `screen and (min-width: ${BREAKPOINTS.md})` });

export const useIsWidescreen = (): MediaQueryResult => 
  useMediaQuery({ query: `screen and (min-width: ${BREAKPOINTS.lg})` });

export default useMediaQuery;
```

This implementation provides a robust and performant media query hook that addresses all the requirements from the technical specification. Here are the key features and design decisions:

1. **Type Safety**:
- Comprehensive TypeScript interfaces for props and return values
- Strict type checking for all parameters and state

2. **Performance Optimizations**:
- Debounced event handler to prevent excessive re-renders
- Memoized callback with useCallback
- Cleanup of event listeners and timeouts

3. **Error Handling**:
- Comprehensive error boundary with typed error state
- Graceful fallback for SSR environments
- Input validation for query strings

4. **Responsive Design Support**:
- Integration with design system breakpoints
- Predefined hooks for common device sizes
- Support for custom media queries

5. **Browser Compatibility**:
- Fallback support for older browsers
- Modern event listener API with legacy support
- SSR compatibility with fallback values

6. **Memory Management**:
- Proper cleanup of event listeners
- Timeout clearance on unmount
- Prevention of memory leaks

The hook can be used in components like this:

```typescript
// Basic usage
const { matches, error } = useMediaQuery({ query: '(min-width: 768px)' });

// Predefined breakpoint usage
const { matches: isMobile } = useIsMobile();
const { matches: isTablet } = useIsTablet();
const { matches: isDesktop } = useIsDesktop();