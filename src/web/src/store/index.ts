/**
 * @fileoverview Root Redux store configuration with enhanced features
 * Implements centralized state management with persistence, type safety,
 * and performance optimizations for the habit tracking application.
 * @version 1.0.0
 */

import { configureStore, createSerializableStateInvariantMiddleware } from '@reduxjs/toolkit'; // v1.9.x
import { persistStore, persistReducer } from 'redux-persist'; // v6.0.x
import storage from 'redux-persist/lib/storage'; // v6.0.x
import { encryptTransform } from 'redux-persist-transform-encrypt'; // v3.0.x

// Feature reducers
import analyticsReducer from './analytics.slice';
import authReducer from './auth.slice';
import habitsReducer from './habits.slice';
import notificationReducer from './notification.slice';
import themeReducer from './theme.slice';

/**
 * Redux persist configuration with selective persistence and encryption
 */
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'theme', 'habits'], // Only persist essential state
  blacklist: ['notifications', 'analytics'], // Exclude transient state
  transforms: [
    encryptTransform({
      secretKey: process.env.VITE_REDUX_ENCRYPTION_KEY || 'default-dev-key',
      onError: (error) => {
        console.error('Redux Persist Encryption Error:', error);
      },
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Redux DevTools configuration for enhanced debugging
 */
const REDUX_DEVTOOLS_CONFIG = {
  name: 'Habit Tracker Store',
  trace: process.env.NODE_ENV === 'development',
  traceLimit: 25,
};

/**
 * Creates the root reducer with all feature reducers
 */
const createRootReducer = () => ({
  analytics: analyticsReducer,
  auth: persistReducer(persistConfig, authReducer),
  habits: habitsReducer,
  notifications: notificationReducer,
  theme: themeReducer,
});

/**
 * Configures the Redux store with middleware and enhancers
 * @param preloadedState - Optional initial state
 */
export const setupStore = (preloadedState?: Partial<RootState>) => {
  // Configure serialization checking middleware
  const serializableMiddleware = createSerializableStateInvariantMiddleware({
    ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
    ignoredPaths: ['notifications'],
  });

  // Create store with configuration
  const store = configureStore({
    reducer: createRootReducer(),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disabled due to custom serialization handling
        thunk: true,
      }).concat(serializableMiddleware),
    preloadedState,
    devTools: process.env.NODE_ENV === 'development' ? REDUX_DEVTOOLS_CONFIG : false,
  });

  // Create persistor
  const persistor = persistStore(store, null, () => {
    // Post-rehydration callback
    store.dispatch({ type: 'REHYDRATION_COMPLETED' });
  });

  return { store, persistor };
};

// Create store instance
const { store, persistor } = setupStore();

// Export store instance and types
export { store, persistor };

/**
 * Type definitions for store state and dispatch
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Type-safe hooks for accessing store state and dispatch
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;