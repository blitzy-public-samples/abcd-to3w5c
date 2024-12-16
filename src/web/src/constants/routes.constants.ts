/**
 * @fileoverview Route constants and configurations for the Habit Tracking Web Application.
 * Provides type-safe route definitions and authentication protection settings.
 * @version 1.0.0
 */

/**
 * Interface defining the structure of route configuration
 * @interface RouteConfig
 * @property {string} path - The URL path for the route
 * @property {boolean} isProtected - Whether the route requires authentication
 * @property {string[]} params - URL parameters expected in the route
 */
export interface RouteConfig {
  path: string;
  isProtected: boolean;
  params: string[];
}

/**
 * Application route paths with type safety
 * Centralized constants for consistent navigation across components
 * @constant
 */
export const ROUTES = {
  /** Landing page route */
  HOME: '/',
  
  /** Authentication routes */
  LOGIN: '/login',
  REGISTER: '/register',
  
  /** Core application routes */
  DASHBOARD: '/dashboard',
  HABITS: '/habits',
  HABIT_DETAILS: '/habits/:id',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  
  /** Fallback route */
  NOT_FOUND: '*'
} as const;

/**
 * Type representing all possible route paths
 * Ensures type safety when using route paths
 */
export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

/**
 * Detailed route configurations with protection and parameter definitions
 * @constant
 */
export const ROUTE_CONFIGS: { [key: string]: RouteConfig } = {
  [ROUTES.HOME]: {
    path: ROUTES.HOME,
    isProtected: false,
    params: []
  },
  [ROUTES.LOGIN]: {
    path: ROUTES.LOGIN,
    isProtected: false,
    params: []
  },
  [ROUTES.REGISTER]: {
    path: ROUTES.REGISTER,
    isProtected: false,
    params: []
  },
  [ROUTES.DASHBOARD]: {
    path: ROUTES.DASHBOARD,
    isProtected: true,
    params: []
  },
  [ROUTES.HABITS]: {
    path: ROUTES.HABITS,
    isProtected: true,
    params: []
  },
  [ROUTES.HABIT_DETAILS]: {
    path: ROUTES.HABIT_DETAILS,
    isProtected: true,
    params: ['id']
  },
  [ROUTES.ANALYTICS]: {
    path: ROUTES.ANALYTICS,
    isProtected: true,
    params: []
  },
  [ROUTES.SETTINGS]: {
    path: ROUTES.SETTINGS,
    isProtected: true,
    params: []
  },
  [ROUTES.PROFILE]: {
    path: ROUTES.PROFILE,
    isProtected: true,
    params: []
  },
  [ROUTES.NOT_FOUND]: {
    path: ROUTES.NOT_FOUND,
    isProtected: false,
    params: []
  }
} as const;

/**
 * List of routes that require authentication
 * Used by AuthGuard component for protecting routes
 * @constant
 */
export const PROTECTED_ROUTES = Object.values(ROUTE_CONFIGS)
  .filter(config => config.isProtected)
  .map(config => config.path) as readonly string[];

/**
 * Helper function to generate parameterized route paths
 * @param {RoutePath} route - Base route path
 * @param {Record<string, string | number>} params - Route parameters
 * @returns {string} Formatted route path with parameters
 */
export const generatePath = (
  route: RoutePath,
  params?: Record<string, string | number>
): string => {
  if (!params) return route;
  
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, String(value)),
    route
  );
};

/**
 * Helper function to check if a route requires authentication
 * @param {string} path - Route path to check
 * @returns {boolean} Whether the route is protected
 */
export const isProtectedRoute = (path: string): boolean => {
  return PROTECTED_ROUTES.some(protectedPath => {
    // Convert route pattern to regex for matching
    const pattern = new RegExp(
      `^${protectedPath.replace(/:[^\s/]+/g, '[^/]+')}$`
    );
    return pattern.test(path);
  });
};

/**
 * Navigation menu structure for main application routes
 * Used by navigation components for rendering menu items
 */
export const NAVIGATION_ROUTES = [
  {
    path: ROUTES.DASHBOARD,
    label: 'Dashboard',
    icon: 'dashboard'
  },
  {
    path: ROUTES.HABITS,
    label: 'Habits',
    icon: 'list'
  },
  {
    path: ROUTES.ANALYTICS,
    label: 'Analytics',
    icon: 'analytics'
  },
  {
    path: ROUTES.SETTINGS,
    label: 'Settings',
    icon: 'settings'
  },
  {
    path: ROUTES.PROFILE,
    label: 'Profile',
    icon: 'person'
  }
] as const;