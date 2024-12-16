import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // react-router-dom version 6.x
import styled from '@emotion/styled'; // @emotion/styled version 11.x
import Button from '../components/common/Button';
import { ROUTES } from '../constants/routes.constants';
import ErrorImage from '../assets/images/error.svg';

/**
 * Styled components implementing responsive design and theme-aware styling
 */
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: clamp(1rem, 5vw, 2rem);
  text-align: center;
  background-color: var(--color-background);
  transition: background-color 0.3s ease;
`;

const StyledErrorImage = styled.img`
  width: clamp(160px, 30vw, 240px);
  height: auto;
  margin-bottom: clamp(1rem, 5vw, 2rem);
  aspect-ratio: 1/1;
  object-fit: contain;
`;

const Title = styled.h1`
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text-primary);
  transition: color 0.3s ease;
`;

const Description = styled.p`
  font-size: clamp(0.875rem, 2vw, 1rem);
  margin-bottom: 2rem;
  color: var(--color-text-secondary);
  max-width: 500px;
  transition: color 0.3s ease;
  line-height: 1.5;
`;

/**
 * NotFound component implementing Material Design principles and accessibility standards
 * Provides user-friendly error message and navigation options for 404 errors
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();

  /**
   * Handles navigation back to home page while logging the 404 occurrence
   */
  const handleNavigateHome = useCallback(() => {
    // Log 404 occurrence for monitoring
    console.error(`404 Error: Page not found - ${window.location.pathname}`);

    // Track analytics event
    if (window.gtag) {
      window.gtag('event', '404_error', {
        page_path: window.location.pathname,
        page_title: document.title
      });
    }

    // Navigate to home page
    navigate(ROUTES.HOME);
  }, [navigate]);

  // Update document metadata
  React.useEffect(() => {
    document.title = '404 - Page Not Found | Habit Tracker';
    
    // Add meta tags for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'The requested page could not be found. Return to the Habit Tracker home page.'
      );
    }

    // Add noindex meta tag
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }
  }, []);

  return (
    <Container role="main" aria-labelledby="error-title">
      <StyledErrorImage
        src={ErrorImage}
        alt="404 Error Illustration"
        role="img"
        aria-label="Page not found illustration"
      />
      <Title id="error-title">404 - Page Not Found</Title>
      <Description>
        The page you're looking for doesn't exist or has been moved.
      </Description>
      <Button
        variant="primary"
        onClick={handleNavigateHome}
        ariaLabel="Go to home page"
        role="link"
      >
        Back to Home
      </Button>
    </Container>
  );
};

export default NotFound;