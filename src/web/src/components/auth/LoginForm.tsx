/**
 * @fileoverview Enhanced login form component with Auth0 integration, comprehensive security,
 * and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  FormControlLabel, 
  Checkbox,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Box,
  Typography 
} from '@mui/material'; // ^5.x
import { Visibility, VisibilityOff } from '@mui/icons-material'; // ^5.x
import { useAuth } from '../../hooks/useAuth';
import { AuthProvider } from '../../types/auth.types';
import { AUTH_ERROR_CODES, AUTH_ROUTES } from '../../constants/auth.constants';

// Interface for form data
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Interface for validation state
interface ValidationState {
  email: { valid: boolean; error: string };
  password: { valid: boolean; error: string };
}

// Initial form state
const initialFormData: LoginFormData = {
  email: '',
  password: '',
  rememberMe: false,
};

// Initial validation state
const initialValidationState: ValidationState = {
  email: { valid: false, error: '' },
  password: { valid: false, error: '' },
};

/**
 * Enhanced login form component with comprehensive security features
 * and accessibility compliance
 */
const LoginForm: React.FC = () => {
  // Hooks
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [formData, setFormData] = useState<LoginFormData>(initialFormData);
  const [validation, setValidation] = useState<ValidationState>(initialValidationState);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Refs for focus management
  const emailRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // Security monitoring
  const lastAttemptRef = useRef<Date | null>(null);

  /**
   * Enhanced email validation with security patterns
   */
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(email);
    
    setValidation(prev => ({
      ...prev,
      email: {
        valid: isValid,
        error: isValid ? '' : 'Please enter a valid email address'
      }
    }));

    return isValid;
  }, []);

  /**
   * Enhanced password validation with security requirements
   */
  const validatePassword = useCallback((password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const isValid = hasMinLength && hasUpperCase && hasLowerCase && 
                   hasNumbers && hasSpecialChar;
    
    setValidation(prev => ({
      ...prev,
      password: {
        valid: isValid,
        error: isValid ? '' : 'Password must meet security requirements'
      }
    }));

    return isValid;
  }, []);

  /**
   * Rate limiting check for login attempts
   */
  const checkRateLimit = useCallback((): boolean => {
    if (!lastAttemptRef.current) return true;
    
    const timeSinceLastAttempt = Date.now() - lastAttemptRef.current.getTime();
    return timeSinceLastAttempt > 1000; // 1 second between attempts
  }, []);

  /**
   * Enhanced form submission handler with security features
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (!checkRateLimit()) {
      setValidation(prev => ({
        ...prev,
        email: { ...prev.email, error: 'Please wait before trying again' }
      }));
      return;
    }

    // Validate all fields
    const isEmailValid = validateEmail(formData.email);
    const isPasswordValid = validatePassword(formData.password);

    if (!isEmailValid || !isPasswordValid) {
      // Announce validation errors to screen readers
      announceValidationErrors();
      return;
    }

    try {
      lastAttemptRef.current = new Date();
      setAttemptCount(prev => prev + 1);

      const result = await login({
        email: formData.email,
        password: formData.password,
        provider: AuthProvider.EMAIL,
        rememberMe: formData.rememberMe
      });

      if (result.success) {
        navigate('/dashboard');
      } else if (result.error?.code === AUTH_ERROR_CODES.MFA_REQUIRED) {
        navigate(AUTH_ROUTES.MFA);
      }
    } catch (err) {
      handleLoginError(err);
    }
  };

  /**
   * Announce validation errors to screen readers
   */
  const announceValidationErrors = () => {
    const errors = Object.values(validation)
      .filter(v => !v.valid && v.error)
      .map(v => v.error)
      .join('. ');
    
    if (errors) {
      const ariaLive = document.getElementById('login-form-announcer');
      if (ariaLive) {
        ariaLive.textContent = `Validation errors: ${errors}`;
      }
    }
  };

  /**
   * Enhanced error handling with security monitoring
   */
  const handleLoginError = (error: any) => {
    console.error('Login error:', error);
    
    if (attemptCount >= 3) {
      // Implement additional security measures after 3 failed attempts
      setTimeout(() => {
        setAttemptCount(0);
      }, 300000); // Reset after 5 minutes
    }
  };

  /**
   * Handle input changes with validation
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rememberMe' ? checked : value
    }));

    if (name === 'email') {
      validateEmail(value);
    } else if (name === 'password') {
      validatePassword(value);
    }
  };

  // Focus management on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="login-title"
      sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}
    >
      {/* Hidden announcer for screen readers */}
      <div
        id="login-form-announcer"
        aria-live="polite"
        className="sr-only"
        role="status"
      />

      <Typography
        id="login-title"
        variant="h1"
        component="h1"
        sx={{ mb: 3 }}
      >
        Sign In
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          role="alert"
        >
          {error}
        </Alert>
      )}

      <TextField
        ref={emailRef}
        fullWidth
        id="email"
        name="email"
        type="email"
        label="Email Address"
        value={formData.email}
        onChange={handleInputChange}
        error={!validation.email.valid && !!validation.email.error}
        helperText={validation.email.error}
        autoComplete="email"
        required
        margin="normal"
        inputProps={{
          'aria-describedby': validation.email.error ? 'email-error' : undefined
        }}
      />

      <TextField
        fullWidth
        id="password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        label="Password"
        value={formData.password}
        onChange={handleInputChange}
        error={!validation.password.valid && !!validation.password.error}
        helperText={validation.password.error}
        autoComplete="current-password"
        required
        margin="normal"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
        inputProps={{
          'aria-describedby': validation.password.error ? 'password-error' : undefined
        }}
      />

      <FormControlLabel
        control={
          <Checkbox
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
            color="primary"
          />
        }
        label="Remember me"
      />

      <Button
        ref={submitButtonRef}
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        disabled={loading || attemptCount >= 3}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Sign In'
        )}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button
          component="a"
          href={AUTH_ROUTES.PASSWORD_RESET}
          variant="text"
          sx={{ textDecoration: 'none' }}
        >
          Forgot password?
        </Button>
      </Box>
    </Box>
  );
};

export default LoginForm;