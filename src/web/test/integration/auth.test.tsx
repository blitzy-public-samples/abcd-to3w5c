/**
 * @fileoverview Integration tests for authentication functionality
 * Tests login, registration, session management, security validation,
 * accessibility compliance, and error handling
 * @version 1.0.0
 */

import { screen, waitFor, fireEvent, within } from '@testing-library/react'; // ^14.0.0
import { rest } from 'msw'; // ^1.2.1
import { setupServer } from 'msw/node'; // ^1.2.1
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'; // ^29.5.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^4.7.3
import { render } from '../utils/test-utils';
import { authApi } from '../../src/api/auth.api';
import { AUTH_ERROR_CODES, AUTH_ROUTES } from '../../src/constants/auth.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  isEmailVerified: true,
  auth0Id: 'auth0|test123',
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: ['user'],
  permissions: ['read:own_habits'],
  metadata: {}
};

// Mock tokens
const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer',
  scope: ['openid', 'profile', 'email']
};

// Mock MFA response
const mockMfaResponse = {
  challengeId: 'mfa-challenge-id',
  type: 'totp'
};

// Setup MSW server
const server = setupServer(
  // Login endpoint
  rest.post(AUTH_ROUTES.API.LOGIN, (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === mockUser.email && password === 'validPassword') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          token: mockTokens,
          user: mockUser,
          error: null,
          message: 'Login successful'
        })
      );
    }

    if (email === 'mfa@example.com') {
      return res(
        ctx.status(200),
        ctx.json({
          success: false,
          error: {
            code: AUTH_ERROR_CODES.MFA_REQUIRED,
            message: 'MFA verification required',
            details: mockMfaResponse
          }
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid credentials'
        }
      })
    );
  }),

  // Registration endpoint
  rest.post(AUTH_ROUTES.API.REGISTER, (req, res, ctx) => {
    const { email } = req.body as any;
    
    if (email === mockUser.email) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: {
            code: 'auth/email-already-exists',
            message: 'Email already exists'
          }
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        token: mockTokens,
        user: { ...mockUser, email },
        error: null,
        message: 'Registration successful'
      })
    );
  }),

  // MFA verification endpoint
  rest.post(AUTH_ROUTES.API.MFA_VERIFY, (req, res, ctx) => {
    const { code, challengeId } = req.body as any;
    
    if (code === '123456' && challengeId === mockMfaResponse.challengeId) {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          token: mockTokens,
          user: mockUser,
          error: null
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          code: AUTH_ERROR_CODES.MFA_INVALID_CODE,
          message: 'Invalid MFA code'
        }
      })
    );
  })
);

describe('Authentication Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully log in with valid credentials', async () => {
      render(<LoginPage />);

      // Fill login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: mockUser.email }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'validPassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/login successful/i)).toBeInTheDocument();
      });

      // Verify token storage
      expect(localStorage.getItem('auth_access_token')).toBeTruthy();
      expect(localStorage.getItem('auth_refresh_token')).toBeTruthy();
    });

    it('should handle MFA challenge when required', async () => {
      render(<LoginPage />);

      // Fill login form with MFA-enabled account
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'mfa@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'validPassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for MFA prompt
      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      });

      // Enter valid MFA code
      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: '123456' }
      });

      // Submit MFA code
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/login successful/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid credentials error', async () => {
      render(<LoginPage />);

      // Fill login form with invalid credentials
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongPassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    it('should successfully register a new user', async () => {
      render(<RegisterPage />);

      // Fill registration form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'new@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'StrongPass123!' }
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'StrongPass123!' }
      });
      fireEvent.click(screen.getByLabelText(/accept terms/i));

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });
    });

    it('should handle duplicate email error', async () => {
      render(<RegisterPage />);

      // Fill registration form with existing email
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: mockUser.email }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'StrongPass123!' }
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'StrongPass123!' }
      });
      fireEvent.click(screen.getByLabelText(/accept terms/i));

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations on login page', async () => {
      const { container } = render(<LoginPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on registration page', async () => {
      const { container } = render(<RegisterPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      render(<LoginPage />);
      
      // Tab through form elements
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordInput);

      fireEvent.keyDown(passwordInput, { key: 'Tab' });
      expect(document.activeElement).toBe(submitButton);
    });
  });
});