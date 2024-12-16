/**
 * @fileoverview Advanced Service Worker implementation for Habit Tracking PWA
 * @version 1.0.0
 * @license MIT
 */

import { API_VERSION } from './constants/api.constants';
import { setCacheNameDetails, clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  Strategy
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Version-based cache naming for proper cache invalidation
const CACHE_VERSION = `v${API_VERSION}`;
const CACHE_NAME = `habit-tracker-${CACHE_VERSION}`;

// Take control of all pages immediately
clientsClaim();

// Configure cache names for different types of resources
setCacheNameDetails({
  prefix: 'habit-tracker',
  suffix: CACHE_VERSION,
  precache: 'precache',
  runtime: 'runtime',
  googleAnalytics: 'ga'
});

/**
 * Advanced cache management system with versioning and cleanup capabilities
 */
class CacheManager {
  private caches: Map<string, Cache>;
  private defaultStrategy: Strategy;
  private expirationPlugin: ExpirationPlugin;

  constructor() {
    this.caches = new Map();
    this.expirationPlugin = new ExpirationPlugin({
      maxEntries: 250,
      maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
    });

    this.defaultStrategy = new NetworkFirst({
      cacheName: CACHE_NAME,
      plugins: [this.expirationPlugin],
      networkTimeoutSeconds: 5
    });
  }

  /**
   * Cleans up outdated caches
   */
  async clearOldCaches(): Promise<void> {
    try {
      const cacheKeys = await caches.keys();
      const oldCacheKeys = cacheKeys.filter(
        key => key.includes('habit-tracker') && key !== CACHE_NAME
      );

      await Promise.all(oldCacheKeys.map(key => caches.delete(key)));
      console.log('[Service Worker] Old caches cleared successfully');
    } catch (error) {
      console.error('[Service Worker] Cache cleanup failed:', error);
      // Report to monitoring system
      self.registration.sync.register('cache-cleanup-retry');
    }
  }
}

// Initialize cache manager
const cacheManager = new CacheManager();

/**
 * Precaches critical assets during service worker installation
 */
async function precacheAssets(): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const criticalAssets = [
      '/index.html',
      '/offline.html',
      '/manifest.json',
      '/static/css/main.css',
      '/static/js/main.js',
      '/static/media/logo.svg'
    ];

    await cache.addAll(criticalAssets);
    console.log('[Service Worker] Precaching completed');
  } catch (error) {
    console.error('[Service Worker] Precaching failed:', error);
    // Retry precaching with exponential backoff
    throw new Error('Precaching failed');
  }
}

/**
 * Configures advanced caching strategies for different types of routes
 */
function setupRoutes(): void {
  // API requests: Network First with offline fallback
  const apiStrategy = new NetworkFirst({
    cacheName: `${CACHE_NAME}-api`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60 // 1 day
      })
    ],
    networkTimeoutSeconds: 5
  });

  // Static assets: Cache First with network fallback
  const staticStrategy = new CacheFirst({
    cacheName: `${CACHE_NAME}-static`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  });

  // Images: Stale While Revalidate with progressive loading
  const imageStrategy = new StaleWhileRevalidate({
    cacheName: `${CACHE_NAME}-images`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
      })
    ]
  });

  // Register routes with appropriate strategies
  registerRoute(
    ({ url }) => url.pathname.startsWith('/api'),
    apiStrategy
  );

  registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    staticStrategy
  );

  registerRoute(
    ({ request }) => request.destination === 'image',
    imageStrategy
  );

  // Navigation routes with offline support
  const navigationRoute = new NavigationRoute(async ({ event }) => {
    try {
      return await apiStrategy.handle(event);
    } catch (error) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline.html');
    }
  });

  registerRoute(navigationRoute);
}

/**
 * Manages background sync for offline operations
 */
async function handleSync(event: SyncEvent): Promise<void> {
  const bgSyncPlugin = new BackgroundSyncPlugin('habitQueue', {
    maxRetentionTime: 24 * 60, // 24 hours
    maxSync: 5,
    onSync: async ({ queue }) => {
      try {
        await queue.replayRequests();
        console.log('[Service Worker] Background sync completed');
      } catch (error) {
        console.error('[Service Worker] Background sync failed:', error);
        throw error;
      }
    }
  });

  if (event.tag === 'habit-sync') {
    await bgSyncPlugin.onSync({ queue: bgSyncPlugin.queue });
  }
}

// Service Worker event listeners
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all([
      precacheAssets(),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all([
      cacheManager.clearOldCaches(),
      self.clients.claim()
    ])
  );
});

self.addEventListener('sync', (event: SyncEvent) => {
  event.waitUntil(handleSync(event));
});

// Initialize routes
setupRoutes();

// Export for testing purposes
export {
  CacheManager,
  precacheAssets,
  setupRoutes,
  handleSync
};