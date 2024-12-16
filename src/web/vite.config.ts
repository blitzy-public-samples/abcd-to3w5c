// @ts-check
import path from 'path'; // v18.x built-in
import { defineConfig } from 'vite'; // v4.3.9
import react from '@vitejs/plugin-react'; // v4.0.0
import { VitePWA } from 'vite-plugin-pwa'; // v0.16.4
import tsconfigPaths from 'vite-tsconfig-paths'; // v4.2.0

// PWA Manifest Configuration
const pwaManifest = {
  name: 'Habit Tracker',
  short_name: 'Habits',
  theme_color: '#ffffff',
  icons: [
    {
      src: '/logo192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/logo512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ],
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  categories: ['productivity', 'lifestyle'],
  orientation: 'any'
};

// PWA Runtime Caching Strategies
const runtimeCaching = [
  {
    urlPattern: '/api/*',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 3600 // 1 hour
      }
    }
  },
  {
    urlPattern: '/assets/*',
    handler: 'CacheFirst',
    options: {
      cacheName: 'asset-cache',
      expiration: {
        maxEntries: 500,
        maxAgeSeconds: 86400 // 24 hours
      }
    }
  }
];

// Manual chunk splitting configuration for optimal loading
const manualChunks = {
  vendor: ['react', 'react-dom', '@mui/material', 'chart.js'],
  framework: ['react', 'react-dom'],
  ui: ['@mui/material'],
  charts: ['chart.js']
};

export default defineConfig({
  root: process.cwd(),
  base: '/',

  // Plugin Configuration
  plugins: [
    // React plugin with Fast Refresh
    react({
      fastRefresh: true,
      jsxRuntime: 'automatic'
    }),

    // PWA Plugin Configuration
    VitePWA({
      registerType: 'autoUpdate',
      manifest: pwaManifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching,
        skipWaiting: true,
        clientsClaim: true
      }
    }),

    // TypeScript path resolution
    tsconfigPaths()
  ],

  // Path Resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Development Server Configuration
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    cors: true,
    hmr: {
      overlay: true
    }
  },

  // Build Configuration
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    minify: true,
    cssMinify: true,
    modulePreload: true,
    rollupOptions: {
      output: {
        manualChunks
      }
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500
  },

  // Preview Server Configuration
  preview: {
    port: 3000,
    strictPort: true
  },

  // Dependency Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      'chart.js',
      'react-query'
    ],
    exclude: [
      '@vite/client',
      '@vite/env'
    ]
  }
});