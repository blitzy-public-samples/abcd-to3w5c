/**
 * @fileoverview Root entry point for the Habit Tracking Web Application.
 * Initializes the app with required providers, service worker registration,
 * error boundaries, and performance monitoring.
 * @version 1.0.0
 */

import React, { StrictMode } from 'react'; // v18.x
import { createRoot } from 'react-dom/client'; // v18.x
import * as Sentry from '@sentry/react'; // v7.x
import { ErrorBoundary } from '@sentry/react'; // v7.x
import { Provider } from 'react-redux'; // v8.x
import { PersistGate } from 'redux-persist/integration/react'; // v6.x

import App from './App';
import { store, persistor } from './store';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import EmptyState from './components/common/EmptyState';

/**
 * Initialize error monitoring and performance tracking
 */
const initializeMonitoring = (): void => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.2,
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ['localhost', /^https:\/\/habittracker\.com/],
        }),
      ],
      beforeSend(event) {
        // Sanitize sensitive data before sending
        if (event.user) {
          delete event.user.ip_address;
          delete event.user.email;
        }
        return event;
      },
    });
  }
};

/**
 * Enhanced service worker configuration with update handling
 */
const serviceWorkerConfig = {
  onSuccess: (registration: ServiceWorkerRegistration) => {
    console.info('[PWA] Content is cached for offline use');
    // Track successful installation
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage('PWA installed successfully', 'info');
    }
  },
  onUpdate: (registration: ServiceWorkerRegistration) => {
    // Notify user of update
    const updateConfirmed = window.confirm(
      'A new version is available. Would you like to update now?'
    );
    if (updateConfirmed && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
  onError: (error: Error) => {
    console.error('[PWA] Service worker registration failed:', error);
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    }
  },
};

/**
 * Initialize and render the React application with error handling
 */
const renderApp = (): void => {
  // Initialize error monitoring
  initializeMonitoring();

  // Get root element with type safety
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find root element');
  }

  // Create root using React 18 concurrent features
  const root = createRoot(rootElement);

  // Render app with error boundary and providers
  root.render(
    <StrictMode>
      <ErrorBoundary
        fallback={({ error }) => (
          <EmptyState
            title="Application Error"
            description={error.message || 'An unexpected error occurred'}
            iconName="error"
          />
        )}
        onError={(error) => {
          console.error('[App Error]', error);
          if (process.env.NODE_ENV === 'production') {
            Sentry.captureException(error);
          }
        }}
      >
        <Provider store={store}>
          <PersistGate
            loading={
              <EmptyState
                title="Loading..."
                description="Please wait while we initialize the application"
                iconName="loading"
              />
            }
            persistor={persistor}
          >
            <App />
          </PersistGate>
        </Provider>
      </ErrorBoundary>
    </StrictMode>
  );

  // Register service worker in production
  if (process.env.NODE_ENV === 'production') {
    registerServiceWorker(serviceWorkerConfig);

    // Monitor performance metrics
    if ('performance' in window && 'observe' in window.performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (process.env.NODE_ENV === 'production') {
            Sentry.captureMessage(`Performance: ${entry.name} - ${entry.value}`, 'info');
          }
        });
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    }
  }
};

// Initialize application
renderApp();