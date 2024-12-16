/**
 * @fileoverview Comprehensive test suite for authentication components
 * Tests LoginForm and RegisterForm components with Auth0 integration,
 * form validation, accessibility, and security features
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import { vi } from 'vitest';
import LoginForm from '../../src/components/auth/LoginForm';
import RegisterForm from '../../src/components/auth/RegisterForm';
import { renderWithProviders } from '../utils/test-utils';
import { AUTH_ERROR_CODES } from '../../src/constants/auth.constants';

// Mock Auth0 hook
const mockUseAuth = vi.fn(() => ({
  login: vi.fn(),
  register: vi.fn(),
  loading: false,
  error: null,
  resetError: vi.fn(),
  isAuthenticated: false
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Test credentials
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test123!@#',
  confirmPassword: 'Test123!@#'
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct ARIA labels and roles', async () => {
    const { container } = renderWithProviders(<LoginForm />);
    
    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify form elements
    expect(screen.getByRole('form')).toHaveAttribute('aria-labelledby', 'login-title');
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('maintains focus management for keyboard navigation', async () => {
    renderWithProviders(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Initial focus should be on email input
    expect(emailInput).toHaveFocus();

    // Tab navigation
    userEvent.tab();
    expect(passwordInput).toHaveFocus();

    userEvent.tab();
    expect(submitButton).toHaveFocus();
  });

  it('validates required fields with appropriate error messages', async () => {
    renderWithProviders(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format with detailed feedback', async () => {
    renderWithProviders(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid-email');

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('implements rate limiting for failed attempts', async () => {
    const { rerender } = renderWithProviders(<LoginForm />);
    const mockLogin = vi.fn().mockRejectedValue({ code: AUTH_ERROR_CODES.UNAUTHORIZED });
    mockUseAuth.mockImplementation(() => ({
      login: mockLogin,
      loading: false,
      error: null
    }));

    // Attempt multiple failed logins
    for (let i = 0; i < 3; i++) {
      await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.email);
      await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      rerender(<LoginForm />);
    }

    await waitFor(() => {
      expect(screen.getByText(/please wait before trying again/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });
  });

  it('handles Auth0 integration errors appropriately', async () => {
    const mockError = { code: AUTH_ERROR_CODES.UNAUTHORIZED, message: 'Invalid credentials' };
    mockUseAuth.mockImplementation(() => ({
      login: vi.fn().mockRejectedValue(mockError),
      loading: false,
      error: mockError
    }));

    renderWithProviders(<LoginForm />);
    
    await userEvent.type(screen.getByLabelText(/email/i), TEST_CREDENTIALS.email);
    await userEvent.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.password);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
    });
  });
});

describe('RegisterForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnSecurityEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with correct ARIA labels and roles', async () => {
    const { container } = renderWithProviders(
      <RegisterForm onSuccess={mockOnSuccess} onSecurityEvent={mockOnSecurityEvent} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Registration form');
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('implements strong password requirements', async () => {
    renderWithProviders(
      <RegisterForm onSuccess={mockOnSuccess} onSecurityEvent={mockOnSecurityEvent} />
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    await userEvent.type(passwordInput, 'weak');

    await waitFor(() => {
      expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
    });

    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, TEST_CREDENTIALS.password);

    await waitFor(() => {
      expect(screen.queryByText(/password must be at least/i)).not.toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    renderWithProviders(
      <RegisterForm onSuccess={mockOnSuccess} onSecurityEvent={mockOnSecurityEvent} />
    );

    await userEvent.type(screen.getByLabelText(/^password$/i), TEST_CREDENTIALS.password);
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different-password');

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('prevents common password patterns', async () => {
    renderWithProviders(
      <RegisterForm onSuccess={mockOnSuccess} onSecurityEvent={mockOnSecurityEvent} />
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    await userEvent.type(passwordInput, 'password123');

    await waitFor(() => {
      expect(screen.getByText(/password contains common weak patterns/i)).toBeInTheDocument();
    });
  });

  it('implements progressive password strength indicator', async () => {
    renderWithProviders(
      <RegisterForm onSuccess={mockOnSuccess} onSecurityEvent={mockOnSecurityEvent} />
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const strengthMeter = screen.getByRole('progressbar');

    // Test progressive strength
    await userEvent.type(passwordInput, 'a');
    expect(strengthMeter).toHaveAttribute('aria-valuenow', '0.2');

    await userEvent.type(passwordInput, 'A1');
    expect(strengthMeter).toHaveAttribute('aria-valuenow', '0.4');

    await userEvent.type(passwordInput, '@');
    expect(strengthMeter).toHaveAttribute('aria-valuenow', '0.6');
  });

  it('maintains accessibility during state changes', async () => {
    const { container } = renderWithProviders(
      <RegisterForm onSuccess={mockOnSuccess} onSecurityEvent={mockOnSecurityEvent} />
    );

    // Test loading state
    mockUseAuth.mockImplementation(() => ({
      register: vi.fn(),
      loading: true,
      error: null
    }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});