import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, useTheme } from '@mui/material';
import styled from '@emotion/styled';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Navigation from '../components/layout/Navigation';
import useMediaQuery from '../hooks/useMediaQuery';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Constants for layout dimensions and transitions
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 64;
const NAVIGATION_WIDTH = 240;
const NAVIGATION_COLLAPSED_WIDTH = 64;
const MOBILE_BREAKPOINT = 'screen and (max-width: 768px)';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
}

// Styled components for layout structure
const LayoutRoot = styled(Box)`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background.default};
`;

const MainContent = styled(Box)<{ $hasNavigation: boolean; $isNavigationCollapsed: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: ${props => props.$hasNavigation ? 
    (props.$isNavigationCollapsed ? `${NAVIGATION_COLLAPSED_WIDTH}px` : `${NAVIGATION_WIDTH}px`) : 
    '0'
  };
  min-height: calc(100vh - ${HEADER_HEIGHT}px - ${FOOTER_HEIGHT}px);
  transition: margin-left 0.3s ease-in-out;
  padding-top: ${HEADER_HEIGHT}px;

  @media ${MOBILE_BREAKPOINT} {
    margin-left: 0;
  }
`;

const ContentContainer = styled(Container)`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing(3)};
  
  @media ${MOBILE_BREAKPOINT} {
    padding: ${props => props.theme.spacing(2)};
  }
`;

/**
 * MainLayout component that provides the core application structure with responsive behavior
 * and accessibility features. Implements Material Design principles and WCAG 2.1 Level AA compliance.
 */
const MainLayout: React.FC<MainLayoutProps> = React.memo(({
  children,
  className,
  showNavigation = true
}) => {
  const theme = useTheme();
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { matches: isMobile } = useMediaQuery({
    query: MOBILE_BREAKPOINT
  });

  // Handle navigation toggle
  const handleNavigationToggle = useCallback(() => {
    if (isMobile) {
      setIsMobileMenuOpen(prev => !prev);
    } else {
      setIsNavigationCollapsed(prev => !prev);
    }
  }, [isMobile]);

  // Handle window resize
  useEffect(() => {
    if (!isMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, isMobileMenuOpen]);

  // Handle escape key for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <ErrorBoundary>
      <LayoutRoot className={className}>
        {/* Skip link for keyboard accessibility */}
        <Box
          component="a"
          href="#main-content"
          sx={{
            position: 'absolute',
            left: '-9999px',
            top: theme.spacing(2),
            backgroundColor: 'background.paper',
            padding: theme.spacing(2),
            zIndex: 'tooltip',
            '&:focus': {
              left: theme.spacing(2),
            },
          }}
        >
          Skip to main content
        </Box>

        {/* Header with navigation controls */}
        <Header
          showMobileMenu={isMobileMenuOpen}
          onMobileMenuToggle={handleNavigationToggle}
          skipLinks={true}
        />

        {/* Navigation sidebar */}
        {showNavigation && (
          <Navigation
            isCollapsed={isNavigationCollapsed}
            onToggle={handleNavigationToggle}
            isAccessible={true}
            ariaLabel="Main navigation"
          />
        )}

        {/* Main content area */}
        <MainContent
          component="main"
          id="main-content"
          role="main"
          aria-label="Main content"
          $hasNavigation={showNavigation}
          $isNavigationCollapsed={isNavigationCollapsed}
        >
          <ContentContainer
            maxWidth="lg"
            role="region"
            aria-label="Content container"
          >
            {children}
          </ContentContainer>
        </MainContent>

        {/* Footer */}
        <Footer />
      </LayoutRoot>
    </ErrorBoundary>
  );
});

// Display name for debugging
MainLayout.displayName = 'MainLayout';

export default MainLayout;