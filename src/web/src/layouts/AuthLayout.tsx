/**
 * @fileoverview Authentication layout component providing consistent structure for auth pages
 * Implements responsive design, theme support, and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect } from 'react';
import { Box, Container, Paper, CircularProgress, useTheme } from '@mui/material'; // v5.x
import { useLocation, useNavigate } from 'react-router-dom'; // v6.x
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import useMediaQuery from '../hooks/useMediaQuery';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Props interface for AuthLayout component
 */
interface AuthLayoutProps {
  /** Child components to be rendered within the layout */
  children: React.ReactNode;
  /** Callback function called on successful authentication */
  onAuthSuccess?: (redirectUrl?: string) => void;
}

/**
 * Authentication layout component providing consistent structure for auth-related pages
 * with responsive design and accessibility features
 */
const AuthLayout: React.FC<AuthLayoutProps> = React.memo(({ children, onAuthSuccess }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { matches: isMobile } = useMediaQuery({ query: `(max-width: ${theme.breakpoints.values.sm}px)` });

  /**
   * Handles successful authentication with proper navigation
   */
  const handleAuthSuccess = useCallback((redirectUrl?: string) => {
    if (onAuthSuccess) {
      onAuthSuccess(redirectUrl);
    }
    // Navigate to dashboard or specified redirect URL
    navigate(redirectUrl || '/dashboard');
  }, [navigate, onAuthSuccess]);

  /**
   * Effect to handle authentication state changes
   */
  useEffect(() => {
    // Set up focus management
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
    }

    // Announce page to screen readers
    const pageTitle = location.pathname.includes('register') ? 'Registration' : 'Login';
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = `${pageTitle} page loaded`;
    document.body.appendChild(announcement);

    return () => {
      document.body.removeChild(announcement);
    };
  }, [location]);

  return (
    <Box
      component="main"
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        padding: theme.spacing(3),
        [theme.breakpoints.up('sm')]: {
          padding: theme.spacing(4),
        },
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={isMobile ? 0 : 3}
          sx={{
            padding: theme.spacing(isMobile ? 2 : 4),
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <ErrorBoundary
            fallbackTitle="Authentication Error"
            fallbackDescription="We encountered an error during authentication. Please try again."
            enableRecovery={true}
          >
            <Box
              role="region"
              aria-label="Authentication form"
              tabIndex={-1}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing(3),
              }}
            >
              {/* Logo or branding could be added here */}
              <Box
                component="img"
                src="/logo.svg"
                alt="Application logo"
                sx={{
                  width: 120,
                  height: 'auto',
                  marginBottom: theme.spacing(2),
                }}
              />

              {/* Render auth forms based on route */}
              {location.pathname.includes('register') ? (
                <RegisterForm onSuccess={handleAuthSuccess} />
              ) : (
                <LoginForm onSuccess={handleAuthSuccess} />
              )}

              {/* Additional content from children prop */}
              {children}
            </Box>
          </ErrorBoundary>
        </Paper>

        {/* Accessibility features */}
        <Box
          role="complementary"
          aria-label="Authentication help"
          sx={{
            marginTop: theme.spacing(2),
            textAlign: 'center',
          }}
        >
          <Box
            component="p"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: theme.typography.body2.fontSize,
            }}
          >
            Need help?{' '}
            <Box
              component="a"
              href="/help"
              sx={{
                color: theme.palette.primary.main,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Contact support
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
});

AuthLayout.displayName = 'AuthLayout';

export default AuthLayout;