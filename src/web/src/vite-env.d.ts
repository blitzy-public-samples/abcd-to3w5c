/// <reference types="vite/client" /> // @version 4.x

/**
 * Type declaration for Vite's environment variables including application-specific
 * Auth0 and API configurations. This interface extends the base ImportMetaEnv
 * provided by Vite.
 */
interface ImportMetaEnv {
  /**
   * Base URL for API endpoints in the habit tracking application
   */
  readonly VITE_API_BASE_URL: string;

  /**
   * Auth0 domain for user authentication
   */
  readonly VITE_AUTH0_DOMAIN: string;

  /**
   * Auth0 client ID for application identification
   */
  readonly VITE_AUTH0_CLIENT_ID: string;

  /**
   * Auth0 audience for API authorization
   */
  readonly VITE_AUTH0_AUDIENCE: string;

  /**
   * Vite mode (development or production)
   */
  readonly MODE: string;

  /**
   * Base URL for the application
   */
  readonly BASE_URL: string;

  /**
   * Production mode flag
   */
  readonly PROD: boolean;

  /**
   * Development mode flag
   */
  readonly DEV: boolean;
}

/**
 * Type declaration for import.meta to include environment variables
 * This ensures type safety when accessing environment variables through import.meta.env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Module declaration for SVG files to be used as React components
 * This enables importing SVG files directly as React components with proper typing
 */
declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default SVGComponent;
}