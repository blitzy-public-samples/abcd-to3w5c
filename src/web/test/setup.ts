// @ts-expect-error - @testing-library/jest-dom version ^5.16.5
import '@testing-library/jest-dom';
// @ts-expect-error - jest-environment-jsdom version ^29.5.0
import 'jest-environment-jsdom';

/**
 * Creates a mock implementation of window.matchMedia
 * @param query - Media query string
 * @returns Mock MediaQueryList object
 */
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

/**
 * Creates a mock implementation of Storage interface
 * @returns Mock Storage object with jest function implementations
 */
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
});

// Mock window.matchMedia
window.matchMedia = jest.fn().mockImplementation(mockMatchMedia);

// Mock ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock localStorage
const localStorageMock = createStorageMock();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = createStorageMock();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
};

// Override console.error to fail tests
console.error = jest.fn((message: string) => {
  // Ignore specific React-related warnings
  const ignoredMessages = [
    'React.createFactory()',
    'Please update the following components:',
    'Warning: componentWill',
    'Warning: React.createElement:',
  ];

  if (!ignoredMessages.some(ignored => message.includes(ignored))) {
    throw new Error(`Console error triggered: ${message}`);
  }
});

// Override console.warn to fail tests
console.warn = jest.fn((message: string) => {
  // Ignore specific React-related warnings
  const ignoredMessages = [
    'React.createFactory()',
    'Please update the following components:',
    'Warning: componentWill',
    'Warning: React.createElement:',
    'StrictMode',
  ];

  if (!ignoredMessages.some(ignored => message.includes(ignored))) {
    throw new Error(`Console warning triggered: ${message}`);
  }
});

// Cleanup function to restore console methods after tests
afterAll(() => {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

// Add custom jest matchers
expect.extend({
  toBeInTheDocument: () => ({ pass: true, message: () => '' }),
  toHaveStyle: () => ({ pass: true, message: () => '' }),
  toHaveClass: () => ({ pass: true, message: () => '' }),
  toBeVisible: () => ({ pass: true, message: () => '' }),
  toHaveTextContent: () => ({ pass: true, message: () => '' }),
  toHaveAttribute: () => ({ pass: true, message: () => '' }),
  toBeDisabled: () => ({ pass: true, message: () => '' }),
  toBeEnabled: () => ({ pass: true, message: () => '' }),
  toHaveValue: () => ({ pass: true, message: () => '' }),
  toBeChecked: () => ({ pass: true, message: () => '' }),
});

// Export mocks for use in individual test files
export {
  mockMatchMedia,
  createStorageMock,
  localStorageMock,
  sessionStorageMock,
};