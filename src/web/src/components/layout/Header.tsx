import React, { useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.x
import styled from '@emotion/styled'; // v11.x
import {
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  Fade,
} from '@mui/material'; // v5.x

import Button from '../common/Button';
import Icon from '../common/Icon';
import ErrorBoundary from '../common/ErrorBoundary';
import useAuth from '../../hooks/useAuth';
import useTheme from '../../hooks/useTheme';
import useAnalytics from '../../hooks/useAnalytics';

/**
 * Styled components for header layout and responsiveness
 */
const StyledAppBar = styled(AppBar)`
  background-color: ${({ theme }) => theme.colors.background.paper};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: background-color 0.2s ease-in-out;
`;

const StyledToolbar = styled(Toolbar)`
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.medium};
  min-height: 64px;

  @media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.spacing.medium} ${({ theme }) => theme.spacing.large};
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
  cursor: pointer;
`;

const NavigationContainer = styled.nav`
  display: none;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium};

  @media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: flex;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
`;

const SkipLink = styled.a`
  position: absolute;
  left: -9999px;
  top: ${({ theme }) => theme.spacing.small};
  background: ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.contrastText};
  padding: ${({ theme }) => theme.spacing.small} ${({ theme }) => theme.spacing.medium};
  z-index: 9999;

  &:focus {
    left: ${({ theme }) => theme.spacing.small};
  }
`;

/**
 * Header component props interface
 */
interface HeaderProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  skipLinks?: boolean;
  children?: React.ReactNode;
}

/**
 * Header component with responsive design, theme switching, and authentication controls
 */
const Header = memo<HeaderProps>(({
  showMobileMenu = false,
  onMobileMenuToggle,
  skipLinks = true,
  children
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { trackEvent } = useAnalytics();

  /**
   * Handles theme toggle with analytics tracking
   */
  const handleThemeToggle = useCallback(() => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    trackEvent('theme_changed', { new_theme: newTheme });
  }, [themeMode, setThemeMode, trackEvent]);

  /**
   * Handles user logout with error handling and analytics
   */
  const handleLogout = useCallback(async () => {
    try {
      trackEvent('logout_initiated');
      await logout();
      trackEvent('logout_successful');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      trackEvent('logout_failed', { error: error.message });
    }
  }, [logout, navigate, trackEvent]);

  return (
    <ErrorBoundary>
      {skipLinks && (
        <SkipLink href="#main-content">
          Skip to main content
        </SkipLink>
      )}

      <StyledAppBar position="fixed" color="default">
        <StyledToolbar>
          <LogoContainer onClick={() => navigate('/')} role="banner">
            <Icon 
              name="logo" 
              size="medium" 
              ariaLabel="Habit Tracker Logo"
            />
          </LogoContainer>

          <NavigationContainer role="navigation">
            <Button
              variant="text"
              onClick={() => navigate('/dashboard')}
              ariaLabel="Go to Dashboard"
            >
              Dashboard
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/habits')}
              ariaLabel="Manage Habits"
            >
              Habits
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/analytics')}
              ariaLabel="View Analytics"
            >
              Analytics
            </Button>
          </NavigationContainer>

          <ActionsContainer>
            <IconButton
              onClick={handleThemeToggle}
              aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} theme`}
              size="large"
            >
              <Icon 
                name={themeMode === 'light' ? 'moon' : 'sun'} 
                size="small"
              />
            </IconButton>

            {isAuthenticated && (
              <>
                <IconButton
                  onClick={() => navigate('/settings')}
                  aria-label="Open Settings"
                  size="large"
                >
                  <Icon name="settings" size="small" />
                </IconButton>

                <Button
                  variant="text"
                  onClick={handleLogout}
                  loading={isLoading}
                  ariaLabel="Log out"
                  startIcon={<Icon name="logout" size="small" />}
                >
                  Logout
                </Button>
              </>
            )}

            {!isAuthenticated && (
              <Button
                variant="primary"
                onClick={() => navigate('/login')}
                ariaLabel="Log in to your account"
              >
                Login
              </Button>
            )}

            {onMobileMenuToggle && (
              <IconButton
                onClick={onMobileMenuToggle}
                aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
                aria-expanded={showMobileMenu}
                aria-controls="mobile-menu"
                size="large"
                sx={{ display: { sm: 'none' } }}
              >
                <Icon name={showMobileMenu ? 'close' : 'menu'} size="small" />
              </IconButton>
            )}
          </ActionsContainer>

          {children}
        </StyledToolbar>
      </StyledAppBar>

      {/* Spacer to prevent content from hiding under fixed header */}
      <Toolbar />
    </ErrorBoundary>
  );
});

Header.displayName = 'Header';

export default Header;