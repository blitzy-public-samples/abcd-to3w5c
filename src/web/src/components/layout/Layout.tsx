import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Box, Container, useTheme } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import useMediaQuery from '../../hooks/useMediaQuery';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * Props interface for the Layout component
 */
interface LayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Styled components for layout structure
 */
const LayoutRoot = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const MainContent = styled.main<{ $isSidebarOpen: boolean; $isMobile: boolean }>`
  flex: 1;
  margin-left: ${({ $isSidebarOpen, $isMobile }) => 
    $isMobile ? '0' : ($isSidebarOpen ? '240px' : '64px')};
  transition: margin-left 0.3s ease-in-out;
  padding-top: 64px; // Header height
`;

const ContentContainer = styled(Container)`
  padding-top: ${({ theme }) => theme.spacing.large};
  padding-bottom: ${({ theme }) => theme.spacing.large};
`;

/**
 * Main layout component that provides the core structure for the application.
 * Implements responsive behavior, theme support, and accessibility features.
 */
const Layout = React.memo<LayoutProps>(({
  children,
  isLoading = false,
  className,
  style
}) => {
  // State and refs
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Hooks
  const theme = useTheme();
  const { matches: isMobile } = useMediaQuery({ 
    query: `screen and (max-width: ${theme.breakpoints.sm})`
  });
  const { matches: isReducedMotion } = useMediaQuery({ 
    query: '(prefers-reduced-motion: reduce)' 
  });

  /**
   * Handles sidebar toggle with animation and accessibility
   */
  const handleSidebarToggle = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setIsSidebarOpen(prev => !prev);

    // Update ARIA attributes
    if (sidebarToggleRef.current) {
      sidebarToggleRef.current.setAttribute('aria-expanded', (!isSidebarOpen).toString());
    }

    // Skip animation if reduced motion is preferred
    if (!isReducedMotion) {
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      setIsAnimating(false);
    }
  }, [isAnimating, isSidebarOpen, isReducedMotion]);

  /**
   * Handles sidebar close for mobile
   */
  const handleSidebarClose = useCallback(() => {
    if (isMobile && !isAnimating) {
      setIsAnimating(true);
      setIsSidebarOpen(false);
      
      // Return focus to toggle button
      if (sidebarToggleRef.current) {
        sidebarToggleRef.current.focus();
      }

      if (!isReducedMotion) {
        setTimeout(() => setIsAnimating(false), 300);
      } else {
        setIsAnimating(false);
      }
    }
  }, [isMobile, isAnimating, isReducedMotion]);

  /**
   * Handles keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarOpen && isMobile) {
        handleSidebarClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, isMobile, handleSidebarClose]);

  return (
    <ErrorBoundary>
      <LayoutRoot className={className} style={style}>
        <Header
          showMobileMenu={isSidebarOpen}
          onMobileMenuToggle={handleSidebarToggle}
          skipLinks={true}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
          aria-expanded={isSidebarOpen}
          isCollapsible={!isMobile}
          transitionDuration={isReducedMotion ? 0 : 300}
        />

        <MainContent
          ref={mainContentRef}
          id="main-content"
          role="main"
          tabIndex={-1}
          $isSidebarOpen={isSidebarOpen}
          $isMobile={isMobile}
        >
          <ContentContainer maxWidth="lg">
            {isLoading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="50vh"
                aria-busy="true"
                aria-label="Loading content"
              >
                {/* Loading spinner would go here */}
              </Box>
            ) : (
              children
            )}
          </ContentContainer>
        </MainContent>

        <Footer />
      </LayoutRoot>
    </ErrorBoundary>
  );
});

// Set display name for debugging
Layout.displayName = 'Layout';

export default Layout;

/**
 * Type export for component props
 */
export type { LayoutProps };