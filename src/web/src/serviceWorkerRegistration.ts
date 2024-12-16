// @version: 1.0.0
// Service Worker Registration Module for Habit Tracking Web Application
// Implements PWA capabilities with comprehensive offline support and cross-browser compatibility

// External imports
// process@latest - Access to environment variables
import { env } from 'process';

// Type definitions for configuration
interface Config {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

// Constants for service worker configuration
const SW_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const FETCH_TIMEOUT = 10000; // 10 seconds timeout for SW fetch
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Check if current environment is localhost
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

/**
 * Validates service worker file and registration with enhanced security checks
 * @param swUrl - URL of the service worker file
 * @param config - Configuration object for callbacks
 */
async function checkValidServiceWorker(
  swUrl: string,
  config?: Config
): Promise<void> {
  try {
    // Fetch service worker with timeout
    const response = await Promise.race([
      fetch(swUrl),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SW fetch timeout')), FETCH_TIMEOUT)
      ),
    ]) as Response;

    // Get the content type of the response
    const contentType = response.headers.get('content-type');

    // Validate response and content type
    if (
      response.status === 404 ||
      (contentType != null && !contentType.includes('javascript'))
    ) {
      // Invalid SW file - unregister and reload
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
    } else {
      // Valid SW file - proceed with registration
      registerValidSW(swUrl, config);
    }
  } catch (error) {
    console.error('Error during service worker validation:', error);
    config?.onError?.(error as Error);
  }
}

/**
 * Registers valid service worker with error boundary and update management
 * @param swUrl - URL of the service worker file
 * @param config - Configuration object for callbacks
 */
async function registerValidSW(swUrl: string, config?: Config): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);

    // Set up update checking interval
    setInterval(() => {
      registration.update().catch(error => {
        console.error('Error checking for SW updates:', error);
        config?.onError?.(error);
      });
    }, SW_UPDATE_INTERVAL);

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New version available
            console.log('New content is available; please refresh.');
            config?.onUpdate?.(registration);
          } else {
            // First time installation
            console.log('Content is cached for offline use.');
            config?.onSuccess?.(registration);
          }
        }
      };
    };
  } catch (error) {
    console.error('Error during service worker registration:', error);
    config?.onError?.(error as Error);
  }
}

/**
 * Registers the service worker for PWA functionality
 * @param config - Configuration object for registration callbacks
 */
export function register(config?: Config): void {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(
      process.env.PUBLIC_URL || '',
      window.location.href
    );

    // Validate same-origin service worker
    if (publicUrl.origin !== window.location.origin) {
      console.error('Service worker origin mismatch');
      return;
    }

    window.addEventListener('load', async () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // Special handling for localhost
        try {
          await checkValidServiceWorker(swUrl, config);
          console.log('Service worker registered for localhost');
        } catch (error) {
          console.error('Error registering SW on localhost:', error);
          config?.onError?.(error as Error);
        }
      } else {
        // Production registration
        try {
          await registerValidSW(swUrl, config);
        } catch (error) {
          console.error('Error registering SW in production:', error);
          config?.onError?.(error as Error);
        }
      }
    });
  }
}

/**
 * Unregisters all service workers with enhanced cleanup
 * @returns Promise<boolean> indicating unregistration success
 */
export async function unregister(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      // Get registration and unregister
      const registration = await navigator.serviceWorker.ready;
      const result = await registration.unregister();

      // Clean up caches
      if (result) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(cacheKey => caches.delete(cacheKey))
        );
      }

      console.log('Service worker unregistered successfully');
      return result;
    } catch (error) {
      console.error('Error unregistering service worker:', error);
      return false;
    }
  }
  return false;
}

// Export named functions for external use
export { checkValidServiceWorker };