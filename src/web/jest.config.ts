import type { Config } from '@jest/types'; // v29.5.0

/**
 * Comprehensive Jest configuration for the web application testing environment.
 * This configuration includes settings for TypeScript support, module mapping,
 * coverage reporting, and performance optimization.
 */
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom for browser environment simulation
  testEnvironment: 'jsdom',

  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts' // Global test setup including custom matchers
  ],

  // Module name mapping for imports
  moduleNameMapper: {
    // Alias for src directory imports
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Handle style file imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle static asset imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/test/__mocks__/fileMock.ts'
  },

  // TypeScript file transformation configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },

  // Test file pattern matching
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider for testing
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Coverage collection and reporting configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover',
    'junit'
  ],

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Performance optimization settings
  maxWorkers: '50%', // Utilize 50% of available CPU cores
  verbose: true, // Detailed test output
  testTimeout: 10000, // 10 second timeout for tests
  errorOnDeprecated: true, // Error on deprecated API usage
  cacheDirectory: '.jest-cache', // Cache directory for faster subsequent runs

  // TypeScript-specific configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
      diagnostics: true // Enable TypeScript diagnostics
    }
  }
};

export default config;