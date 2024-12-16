/**
 * @fileoverview Secure and accessible registration form component with Auth0 integration
 * Implements comprehensive validation, security features, and Material Design principles
 * @version 1.0.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form'; // ^7.0.0
import { TextField, Box, FormHelperText, LinearProgress } from '@mui/material'; // ^5.0.0
import { PasswordStrengthMeter } from '@mui/lab'; // ^5.0.0
import DOMPurify from 'dompurify'; // ^3.0.0

import { RegisterCredentials } from '../../types/auth.types';
import { validateRegistrationCredentials } from '../../validators/auth.validator';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import { AUTH_CONFIG } from '../../constants/auth.constants';

// Security event type for monitoring registration attempts
type SecurityEvent = {
  type: 'REGISTRATION_ATTEMPT' | 'VALIDATION_FAILURE' | 'RATE_LIMIT_EXCEEDED';
  details: Record<string, any>;
  timestamp: Date;
};

interface RegisterFormProps {
  onSuccess: () => void;
  onSecurityEvent: (event: SecurityEvent) => void;
  maxAttempts?: number;
  cooldownPeriod?: number;
}

/**
 * Enhanced registration form with comprehensive security features and accessibility
 */
const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSecurityEvent,
  maxAttempts = AUTH_CONFIG.LOGIN_RATE_LIMIT,
  cooldownPeriod = 300
}) => {
  // Form state management with validation
  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterCredentials>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    }
  });

  // Authentication hook with rate limiting
  const { register, loading, error, rateLimitStatus } = useAuth();

  // Local state for security tracking
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Watch password field for strength calculation
  const password = watch('password');

  /**
   * Calculate password strength with multiple criteria
   */
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    // Length check
    if (password.length >= AUTH_CONFIG.PROVIDERS.EMAIL.passwordMinLength) strength += 0.2;
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 0.2;
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 0.2;
    // Numbers check
    if (/\d/.test(password)) strength += 0.2;
    // Special characters check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 0.2;

    setPasswordStrength(strength);
  }, [password]);

  /**
   * Enhanced form submission handler with security features
   */
  const onSubmit = useCallback(async (data: RegisterCredentials) => {
    try {
      // Check rate limiting
      if (cooldownUntil && new Date() < cooldownUntil) {
        onSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          details: { remainingTime: cooldownUntil.getTime() - Date.now() },
          timestamp: new Date()
        });
        return;
      }

      // Sanitize input data
      const sanitizedData = {
        ...data,
        email: DOMPurify.sanitize(data.email),
        password: data.password // Passwords should not be sanitized
      };

      // Validate form data
      const validationResult = validateRegistrationCredentials(sanitizedData);
      if (!validationResult.isValid) {
        onSecurityEvent({
          type: 'VALIDATION_FAILURE',
          details: validationResult.errors,
          timestamp: new Date()
        });
        return;
      }

      // Track registration attempt
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Check max attempts
      if (newAttempts >= maxAttempts) {
        const cooldown = new Date(Date.now() + cooldownPeriod * 1000);
        setCooldownUntil(cooldown);
        onSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          details: { maxAttempts, cooldownPeriod },
          timestamp: new Date()
        });
        return;
      }

      // Attempt registration
      const result = await register(sanitizedData);
      
      if (result.success) {
        onSuccess();
        setAttempts(0);
        setCooldownUntil(null);
      }

    } catch (error) {
      onSecurityEvent({
        type: 'REGISTRATION_ATTEMPT',
        details: { error, attempts: attempts + 1 },
        timestamp: new Date()
      });
    }
  }, [attempts, cooldownUntil, maxAttempts, cooldownPeriod, register, onSuccess, onSecurityEvent]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Registration form"
      sx={{ width: '100%', maxWidth: 400 }}
    >
      {/* Email field */}
      <Controller
        name="email"
        control={control}
        rules={{
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            autoComplete="email"
            autoFocus
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isSubmitting || !!cooldownUntil}
            aria-describedby="email-error"
            InputProps={{
              'aria-invalid': !!errors.email,
              'aria-required': true
            }}
          />
        )}
      />

      {/* Password field */}
      <Controller
        name="password"
        control={control}
        rules={{
          required: 'Password is required',
          minLength: {
            value: AUTH_CONFIG.PROVIDERS.EMAIL.passwordMinLength,
            message: `Password must be at least ${AUTH_CONFIG.PROVIDERS.EMAIL.passwordMinLength} characters`
          }
        }}
        render={({ field }) => (
          <Box sx={{ mb: 2 }}>
            <TextField
              {...field}
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isSubmitting || !!cooldownUntil}
              aria-describedby="password-error password-strength"
              InputProps={{
                'aria-invalid': !!errors.password,
                'aria-required': true
              }}
            />
            <PasswordStrengthMeter
              value={passwordStrength}
              aria-label="Password strength indicator"
              id="password-strength"
            />
          </Box>
        )}
      />

      {/* Confirm Password field */}
      <Controller
        name="confirmPassword"
        control={control}
        rules={{
          required: 'Please confirm your password',
          validate: value => value === watch('password') || 'Passwords do not match'
        }}
        render={({ field }) => (
          <TextField
            {...field}
            margin="normal"
            required
            fullWidth
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            disabled={isSubmitting || !!cooldownUntil}
            aria-describedby="confirm-password-error"
            InputProps={{
              'aria-invalid': !!errors.confirmPassword,
              'aria-required': true
            }}
          />
        )}
      />

      {/* Error messages */}
      {error && (
        <FormHelperText
          error
          role="alert"
          sx={{ mt: 2 }}
        >
          {error}
        </FormHelperText>
      )}

      {/* Rate limit warning */}
      {cooldownUntil && (
        <FormHelperText
          error
          role="alert"
          sx={{ mt: 2 }}
        >
          Too many attempts. Please try again in {Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000)} seconds.
        </FormHelperText>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        fullWidth
        variant="primary"
        size="large"
        disabled={isSubmitting || !!cooldownUntil}
        loading={loading}
        sx={{ mt: 3, mb: 2 }}
        aria-label="Create account"
      >
        Create Account
      </Button>

      {/* Loading indicator */}
      {loading && (
        <LinearProgress
          aria-label="Registration in progress"
          sx={{ mt: 2 }}
        />
      )}
    </Box>
  );
};

export default RegisterForm;