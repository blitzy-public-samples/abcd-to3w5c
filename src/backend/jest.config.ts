// @ts-check
import type { Config } from '@jest/types'; // v29.0.0

/**
 * Comprehensive Jest configuration for backend microservices testing
 * Includes TypeScript support, coverage reporting, and module resolution
 * @returns {Config.InitialOptions} Complete Jest configuration object
 */
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set Node.js as the test environment
  testEnvironment: 'node',
  
  // Define root directory for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module resolution mapping for microservices architecture
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@shared/(.*)': '<rootDir>/src/shared/$1',
    '@proto/(.*)': '<rootDir>/src/proto/$1',
    '@analytics/(.*)': '<rootDir>/src/analytics-service/src/$1',
    '@auth/(.*)': '<rootDir>/src/auth-service/src/$1',
    '@habits/(.*)': '<rootDir>/src/habit-service/src/$1',
    '@notifications/(.*)': '<rootDir>/src/notification-service/src/$1',
    '@gateway/(.*)': '<rootDir>/src/api-gateway/src/$1'
  },
  
  // Supported file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test setup file
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/proto/**/*'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout setting (10 seconds)
  testTimeout: 10000,
  
  // Enable verbose output
  verbose: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true
    }
  }
};

export default config;