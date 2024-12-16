/**
 * @fileoverview Root application component providing core application structure,
 * routing configuration, theme provider, and state management setup.
 * @version 1.0.0
 */

import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // v6.x
import { Provider } from 'react-redux'; // v8.x
import { PersistGate } from 'redux-persist/integration/react'; // v6.x
import { ThemeProvider, CssBaseline } from '@mui/material'; // v5.x
import { ErrorBoundary } from 'react-error-boundary'; // v4.x

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Store and Theme
import { store, persistor } from './store';
import { ThemeManager } from './store/theme.slice';
import useTheme from './hooks/useTheme';
import { ROUTES, isProtectedRoute } from './constants/routes.constants';

// Error handling components
import EmptyState from './components/common/EmptyState';

// Performance monitoring
const PERFORMANCE_METRICS = {
  FCP: 'first-contentful-paint',
  LCP: 'largest-contentful-paint',
  FID: 'first-input-delay',
  CLS: 'cumulative-layout-shift'
};

/**
 * Root application component with theme support and error boundaries
 */
const AppContent: React.FC = () => {
  const { themeMode, themeError } = useTheme();

  // Initialize theme manager
  useEffect(() => {
    const themeManager = new ThemeManager();
    themeManager.initialize(store.dispatch);

    return () => themeManager.cleanup();
  }, []);

  // Monitor core web vitals
  useEffect(() => {
    if ('performance' in window && 'observe' in window.performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.info(`[Performance] ${entry.name}:`, entry.value);
        });
      });

      observer.observe({ entryTypes: ['paint', 'layout-shift', 'first-input'] });

      return () => observer.disconnect();
    }
  }, []);

  // Handle theme errors
  if (themeError) {
    return (
      <EmptyState
        title="Theme Error"
        description="Failed to initialize theme. Please refresh the page."
        iconName="error"
      />
    );
  }

  return (
    <ThemeProvider theme={themeMode}>
      <CssBaseline />
      <BrowserRouter>
        <Suspense
          fallback={
            <EmptyState
              title="Loading..."
              description="Please wait while we load the application."
              iconName="loading"
            />
          }
        >
          <Routes>
            {/* Public routes */}
            <Route path={ROUTES.HOME} element={<MainLayout />}>
              <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            </Route>

            {/* Authentication routes */}
            <Route element={<AuthLayout />}>
              <Route path={ROUTES.LOGIN} element={<React.Fragment />} />
              <Route path={ROUTES.REGISTER} element={<React.Fragment />} />
            </Route>

            {/* Protected routes */}
            <Route
              element={
                <DashboardLayout>
                  <RequireAuth />
                </DashboardLayout>
              }
            >
              <Route path={ROUTES.DASHBOARD} element={<React.Fragment />} />
              <Route path={ROUTES.HABITS} element={<React.Fragment />} />
              <Route path={ROUTES.ANALYTICS} element={<React.Fragment />} />
              <Route path={ROUTES.SETTINGS} element={<React.Fragment />} />
              <Route path={ROUTES.PROFILE} element={<React.Fragment />} />
            </Route>

            {/* Fallback route */}
            <Route
              path="*"
              element={
                <EmptyState
                  title="Page Not Found"
                  description="The page you're looking for doesn't exist."
                  iconName="error"
                />
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
};

/**
 * Authentication guard component for protected routes
 */
const RequireAuth: React.FC = () => {
  const location = useLocation();

  if (isProtectedRoute(location.pathname)) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return null;
};

/**
 * Root application component with error boundary and state management
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <EmptyState
          title="Application Error"
          description={error.message || 'An unexpected error occurred.'}
          iconName="error"
        />
      )}
      onError={(error) => {
        console.error('[App Error]', error);
        // Add error reporting service integration here
      }}
    >
      <Provider store={store}>
        <PersistGate
          loading={
            <EmptyState
              title="Loading..."
              description="Initializing application..."
              iconName="loading"
            />
          }
          persistor={persistor}
        >
          <AppContent />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;