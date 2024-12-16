/**
 * @fileoverview Comprehensive testing utilities for React components with Redux, Router and Persistence support
 * Provides type-safe testing utilities and provider wrappers for complex testing scenarios
 * @version 1.0.0
 */

import React from 'react';
import { render, RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react'; // ^14.0.0
import { Provider } from 'react-redux'; // ^8.1.0
import { PersistGate } from 'redux-persist/integration/react'; // ^6.0.0
import { BrowserRouter, MemoryRouter } from 'react-router-dom'; // ^6.11.0
import { store, persistor } from '../../src/store';
import type { RootState } from '../../src/store';

/**
 * Default test route for router testing
 */
const TEST_ROUTE = '/';

/**
 * Extended render options with Redux and router support
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial Redux state for test configuration
   */
  initialState?: Partial<RootState>;
  /**
   * Initial route for router testing
   */
  route?: string;
  /**
   * Flag to skip persistence layer in tests
   */
  skipPersist?: boolean;
}

/**
 * Default render options
 */
const DEFAULT_RENDER_OPTIONS: CustomRenderOptions = {
  skipPersist: false,
};

/**
 * Creates a configured test store instance with optional initial state and persistence
 * @param initialState - Partial initial state to override defaults
 * @param skipPersist - Whether to skip persistence layer
 * @returns Configured test store instance
 */
export const createTestStore = (
  initialState?: Partial<RootState>,
  skipPersist: boolean = false
) => {
  // Create new store instance for test isolation
  const testStore = { ...store };

  // Override initial state if provided
  if (initialState) {
    testStore.dispatch({ type: 'TEST/INITIALIZE', payload: initialState });
  }

  // Configure persistence
  if (!skipPersist) {
    persistor.persist();
  }

  return testStore;
};

/**
 * Enhanced render function that wraps components with Redux Provider, Router, and PersistGate
 * @param ui - React component to render
 * @param options - Custom render options
 * @returns Rendered component with store reference
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  {
    initialState,
    route = TEST_ROUTE,
    skipPersist = DEFAULT_RENDER_OPTIONS.skipPersist,
    ...renderOptions
  }: CustomRenderOptions = DEFAULT_RENDER_OPTIONS
) => {
  // Create test store instance
  const testStore = createTestStore(initialState, skipPersist);

  // Create wrapper with all required providers
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const Router = route ? MemoryRouter : BrowserRouter;
    
    return (
      <Provider store={testStore}>
        {skipPersist ? (
          <Router initialEntries={[route]}>
            {children}
          </Router>
        ) : (
          <PersistGate loading={null} persistor={persistor}>
            <Router initialEntries={[route]}>
              {children}
            </Router>
          </PersistGate>
        )}
      </Provider>
    );
  };

  // Render with all providers
  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Return render result with store reference
  return {
    ...renderResult,
    store: testStore,
    // Re-export commonly used testing utilities
    screen,
    fireEvent,
    waitFor,
  };
};

// Export testing utilities
export * from '@testing-library/react';
export { renderWithProviders as render };