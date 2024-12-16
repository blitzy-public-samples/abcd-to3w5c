/**
 * @fileoverview Enhanced login page component with comprehensive security features,
 * accessibility compliance, and responsive design.
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SecurityMonitor } from '@auth0/security-monitor';

import AuthLayout from '../layouts/AuthLayout';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { AUTH_ROUTES } from '../constants/auth.constants';

// Initialize security monitoring
const securityMonitor = new SecurityMonitor({
  enableLogging: process.env.NODE_ENV === 'production',
  maxAttempts: 5,
  cooldownPeriod: 900000, // 15 minutes
});

/**
 * Enhanced login page component with security features and accessibility support
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginAttempts, isRateLimited } = useAuth();

  /**
   * Handles successful login with enhanced security validation
   */
  const handleLoginSuccess = useCallback(async (response: any) => {
    try {
      // Log successful authentication
      securityMonitor.logAuthEvent({
        type: 'LOGIN_SUCCESS',
        timestamp: new Date(),
        metadata: {
          source: location.state?.from || '/dashboard'
        }
      });

      // Get return URL from location state or default to dashboard
      const returnUrl = location.state?.from || '/dashboard';

      // Validate return URL to prevent open redirects
      const isValidUrl = /^\/[a-zA-Z0-9\-_/]*$/.test(returnUrl);
      
      // Navigate to validated URL or fallback to dashboard
      navigate(isValidUrl ? returnUrl : '/dashboard', { replace: true });

    } catch (error) {
      console.error('Login success handler failed:', error);
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, location]);

  /**
   * Handles login failures with security monitoring
   */
  const handleLoginError = useCallback((error: Error) => {
    // Log failed attempt
    securityMonitor.logAuthEvent({
      type: 'LOGIN_FAILURE',
      timestamp: new Date(),
      error: error.message,
      metadata: {
        attempts: loginAttempts + 1
      }
    });

    // Trigger security alert if threshold exceeded
    if (loginAttempts >= 3) {
      securityMonitor.triggerAlert({
        type: 'EXCESSIVE_LOGIN_ATTEMPTS',
        severity: 'warning',
        details: {
          attempts: loginAttempts,
          timestamp: new Date()
        }
      });
    }
  }, [loginAttempts]);

  /**
   * Redirect authenticated users
   */
  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = location.state?.from || '/dashboard';
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <ErrorBoundary
      fallbackTitle="Authentication Error"
      fallbackDescription="We encountered an error during authentication. Please try again."
      enableRecovery={true}
    >
      <AuthLayout>
        <LoginForm
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          isRateLimited={isRateLimited}
          attemptCount={loginAttempts}
        />
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default Login;