import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { Box, Container, CircularProgress } from '@mui/material';

// Internal imports
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import useMediaQuery from '../hooks/useMediaQuery';
import useAuth from '../hooks/useAuth';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Props interface for the DashboardLayout component
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
  disablePadding?: boolean;
  className?: string;
}

/**
 * Styled components for layout structure
 */
const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

const MainContent = styled.main<{ $isSidebarOpen: boolean; $isMobile: boolean }>`
  flex: 1;
  margin-left: ${({ $isSidebarOpen, $isMobile }) => 
    $isMobile ? '0' : ($isSidebarOpen ? '240px' : '64px')};
  transition: margin-left 0.3s ease-in-out;
  min-height: 100vh;
  padding-top: 64px; // Header height
  background-color: ${({ theme }) => theme.colors.background.default};

  @media (max-width: 768px) {
    margin-left: 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.default};
`;

/**
 * DashboardLayout component implementing responsive layout structure with
 * enhanced accessibility and theme support.
 */
const DashboardLayout = React.memo<DashboardLayoutProps>(({
  children,
  disablePadding = false,
  className
}) => {
  // Authentication and loading state
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Responsive state management
  const { matches: isMobile } = useMediaQuery({ query: 'screen and (max-width: 768px)' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle sidebar close for mobile
  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Update sidebar state on viewport changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Show loading state
  if (isLoading) {
    return (
      <LoadingContainer>
        <CircularProgress 
          size={40}
          aria-label="Loading dashboard"
        />
      </LoadingContainer>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <ErrorBoundary>
      <LayoutContainer className={className}>
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            '&:focus': {
              position: 'fixed',
              top: '16px',
              left: '16px',
              width: 'auto',
              height: 'auto'
            }
          }}
        >
          Skip to main content
        </a>

        {/* Header component */}
        <Header
          showMobileMenu={isSidebarOpen}
          onMobileMenuToggle={handleSidebarToggle}
        />

        {/* Sidebar component */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
          aria-expanded={isSidebarOpen}
          aria-label="Main navigation"
        />

        {/* Main content area */}
        <MainContent
          id="main-content"
          $isSidebarOpen={isSidebarOpen}
          $isMobile={isMobile}
          role="main"
          aria-label="Main content"
        >
          <Container
            maxWidth="xl"
            sx={{
              py: disablePadding ? 0 : 3,
              px: disablePadding ? 0 : { xs: 2, sm: 3 }
            }}
          >
            <Suspense fallback={
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={40} />
              </Box>
            }>
              {children}
            </Suspense>
          </Container>
        </MainContent>
      </LayoutContainer>
    </ErrorBoundary>
  );
});

// Set display name for debugging
DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;