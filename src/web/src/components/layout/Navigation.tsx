import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import useAnalytics from '@analytics/react';
import { ROUTES } from '../../constants/routes.constants';
import { useAuth } from '../../hooks/useAuth';
import useMediaQuery from '../../hooks/useMediaQuery';
import Icon from '../common/Icon';
import ErrorBoundary from '../common/ErrorBoundary';

// Constants for navigation
const MOBILE_BREAKPOINT = 'screen and (max-width: 768px)';
const TRANSITION_DURATION = '0.3s';
const MENU_WIDTH = '240px';

// Interfaces
interface NavigationProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  isAccessible?: boolean;
  ariaLabel?: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  requiresAuth?: boolean;
  ariaLabel?: string;
  description?: string;
}

// Styled components
const NavContainer = styled.nav<{ $isCollapsed: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${props => props.$isCollapsed ? '64px' : MENU_WIDTH};
  height: 100vh;
  background-color: ${props => props.theme.colors.background.paper};
  border-right: 1px solid ${props => props.theme.colors.background.surface};
  transition: width ${TRANSITION_DURATION} ease-in-out;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  overflow-x: hidden;
  overflow-y: auto;

  @media ${MOBILE_BREAKPOINT} {
    transform: translateX(${props => props.$isCollapsed ? '-100%' : '0'});
    width: ${MENU_WIDTH};
  }
`;

const SkipLink = styled.a`
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;

  &:focus {
    position: fixed;
    top: 16px;
    left: 16px;
    width: auto;
    height: auto;
    padding: 16px;
    background: ${props => props.theme.colors.background.paper};
    z-index: 1001;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
`;

const NavItemContainer = styled.li`
  width: 100%;
  margin: 4px 0;
`;

const NavLink = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: ${props => props.$isActive ? props.theme.colors.primary.main : props.theme.colors.background.surface};
  text-decoration: none;
  transition: background-color 0.2s ease;
  border-radius: 4px;
  margin: 0 8px;

  &:hover {
    background-color: ${props => props.theme.colors.background.surface}20;
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary.main};
    outline-offset: -2px;
  }
`;

const NavText = styled.span<{ $isCollapsed: boolean }>`
  margin-left: 12px;
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  transition: opacity ${TRANSITION_DURATION} ease-in-out;
  white-space: nowrap;
`;

// Navigation component
const Navigation = React.memo<NavigationProps>(({
  isCollapsed = false,
  onToggle,
  isAccessible = true,
  ariaLabel = 'Main navigation'
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuth();
  const { matches: isMobile } = useMediaQuery({ query: MOBILE_BREAKPOINT });
  const analytics = useAnalytics();

  // Navigation items with authentication awareness
  const navItems: NavItem[] = [
    {
      path: ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: 'dashboard',
      requiresAuth: true,
      ariaLabel: 'Go to dashboard',
      description: 'View your habit tracking dashboard'
    },
    {
      path: ROUTES.HABITS,
      label: 'Habits',
      icon: 'list',
      requiresAuth: true,
      ariaLabel: 'Manage habits',
      description: 'View and manage your habits'
    },
    {
      path: ROUTES.ANALYTICS,
      label: 'Analytics',
      icon: 'analytics',
      requiresAuth: true,
      ariaLabel: 'View analytics',
      description: 'View your habit tracking analytics'
    },
    {
      path: ROUTES.SETTINGS,
      label: 'Settings',
      icon: 'settings',
      requiresAuth: true,
      ariaLabel: 'Adjust settings',
      description: 'Manage your account settings'
    },
    {
      path: ROUTES.PROFILE,
      label: 'Profile',
      icon: 'person',
      requiresAuth: true,
      ariaLabel: 'View profile',
      description: 'View and edit your profile'
    }
  ];

  // Filter items based on authentication state
  const filteredNavItems = navItems.filter(item => 
    !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );

  // Track navigation analytics
  const handleNavigation = useCallback((path: string, label: string) => {
    analytics.track('navigation_click', {
      path,
      label,
      timestamp: new Date().toISOString()
    });
  }, [analytics]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCollapsed && onToggle) {
        onToggle();
      }
    };

    if (isAccessible) {
      window.addEventListener('keydown', handleKeyboard);
      return () => window.removeEventListener('keydown', handleKeyboard);
    }
  }, [isCollapsed, onToggle, isAccessible]);

  if (isLoading) {
    return null;
  }

  return (
    <ErrorBoundary
      fallbackTitle="Navigation Error"
      fallbackDescription="There was an error loading the navigation menu. Please try refreshing the page."
    >
      {isAccessible && (
        <SkipLink href="#main-content">
          Skip to main content
        </SkipLink>
      )}

      <NavContainer
        $isCollapsed={isCollapsed}
        role="navigation"
        aria-label={ariaLabel}
      >
        <NavList>
          {filteredNavItems.map((item) => (
            <NavItemContainer key={item.path}>
              <NavLink
                to={item.path}
                $isActive={location.pathname === item.path}
                onClick={() => handleNavigation(item.path, item.label)}
                aria-label={item.ariaLabel}
                aria-current={location.pathname === item.path ? 'page' : undefined}
                title={item.description}
              >
                <Icon
                  name={item.icon}
                  size="small"
                  aria-hidden="true"
                  focusable={false}
                />
                <NavText $isCollapsed={isCollapsed}>
                  {item.label}
                </NavText>
              </NavLink>
            </NavItemContainer>
          ))}
        </NavList>
      </NavContainer>
    </ErrorBoundary>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;