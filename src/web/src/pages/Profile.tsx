import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Skeleton, 
  Alert 
} from '@mui/material';
import MainLayout from '../layouts/MainLayout';
import ProfileSettings from '../components/settings/ProfileSettings';
import { useAuth } from '../hooks/useAuth';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ROUTES } from '../constants/routes.constants';

/**
 * Profile page component that provides user profile management functionality.
 * Implements secure authentication checks, responsive design, and proper error handling.
 * 
 * @returns {JSX.Element} Rendered profile page or redirect to login
 */
const Profile: React.FC = React.memo(() => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <Navigate 
        to={ROUTES.LOGIN} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <MainLayout>
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
            <Skeleton 
              variant="rectangular" 
              height={48} 
              width="60%" 
              sx={{ mb: 3 }}
            />
            <Skeleton 
              variant="rectangular" 
              height={400}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  // Memoized alert message for email verification
  const emailVerificationAlert = useMemo(() => {
    if (user && !user.isEmailVerified) {
      return (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          role="alert"
        >
          Please verify your email address to access all features.
        </Alert>
      );
    }
    return null;
  }, [user]);

  return (
    <MainLayout>
      <ErrorBoundary
        fallbackTitle="Profile Error"
        fallbackDescription="There was an error loading your profile. Please try again later."
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              py: { xs: 2, sm: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}
          >
            {/* Page Header */}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 'medium',
                color: 'text.primary',
                mb: { xs: 2, sm: 3 }
              }}
            >
              Profile Settings
            </Typography>

            {/* Email Verification Alert */}
            {emailVerificationAlert}

            {/* Profile Settings Form */}
            <ProfileSettings />
          </Box>
        </Container>
      </ErrorBoundary>
    </MainLayout>
  );
});

// Display name for debugging
Profile.displayName = 'Profile';

export default Profile;