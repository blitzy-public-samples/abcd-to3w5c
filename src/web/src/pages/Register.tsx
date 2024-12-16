/**
 * @fileoverview Registration page component with secure user account creation,
 * comprehensive form validation, and accessibility features.
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';

/**
 * Registration page component implementing secure user registration with
 * Auth0 integration, comprehensive validation, and WCAG 2.1 Level AA compliance.
 */
const Register: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  /**
   * Handles successful registration with proper navigation
   */
  const handleRegistrationSuccess = useCallback(() => {
    // Navigate to dashboard after successful registration
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  /**
   * Effect to handle authentication state and redirect if already authenticated
   */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Effect to manage focus and accessibility announcements
   */
  useEffect(() => {
    // Set page title for accessibility
    document.title = 'Register - Habit Tracker';

    // Create and manage ARIA live region for status announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    // Announce page load to screen readers
    liveRegion.textContent = 'Registration page loaded';

    // Cleanup on unmount
    return () => {
      document.body.removeChild(liveRegion);
      document.title = 'Habit Tracker'; // Reset title
    };
  }, []);

  /**
   * Handles registration errors with proper error tracking
   */
  const handleRegistrationError = useCallback((error: Error) => {
    console.error('Registration error:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      // Add additional error context as needed
    });
  }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <AuthLayout>
        <div
          role="status"
          aria-label="Loading"
          className="loading-container"
        >
          <span className="sr-only">Loading registration page...</span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <RegisterForm
        onSuccess={handleRegistrationSuccess}
        onSecurityEvent={(event) => {
          // Handle security events (rate limiting, validation failures, etc.)
          console.info('Security event:', {
            type: event.type,
            details: event.details,
            timestamp: event.timestamp
          });
        }}
        maxAttempts={5} // Maximum registration attempts before rate limiting
        cooldownPeriod={300} // 5 minutes cooldown after max attempts
      />
    </AuthLayout>
  );
});

// Set display name for better debugging
Register.displayName = 'Register';

export default Register;