import React from 'react'; // React 18.x
import { Box, Container, Typography, Link } from '@mui/material'; // Material UI 5.x
import useMediaQuery from '../../hooks/useMediaQuery';
import { BREAKPOINTS } from '../../constants/theme.constants';

/**
 * Props interface for Footer component
 */
interface FooterProps {
  className?: string;
}

/**
 * Constants for footer configuration
 */
const FOOTER_HEIGHT = 64;
const CURRENT_YEAR = new Date().getFullYear();
const COMPANY_NAME = 'Habit Tracker';

/**
 * Footer component that provides consistent layout and branding across the application.
 * Implements responsive design and accessibility requirements.
 *
 * @param {FooterProps} props - Component props
 * @returns {JSX.Element} Rendered footer component
 */
const Footer: React.FC<FooterProps> = React.memo(({ className }) => {
  // Media query hooks for responsive design
  const { matches: isMobile } = useMediaQuery({ 
    query: `screen and (max-width: ${BREAKPOINTS.sm})` 
  });
  const { matches: isSmallScreen } = useMediaQuery({ 
    query: `screen and (max-width: ${BREAKPOINTS.xs})` 
  });

  // Dynamic spacing based on screen size
  const spacing = {
    py: isMobile ? 2 : 3,
    px: isSmallScreen ? 2 : 3
  };

  // Footer links configuration
  const footerLinks = [
    { text: 'Privacy Policy', href: '/privacy' },
    { text: 'Terms of Service', href: '/terms' },
    { text: 'Contact Us', href: '/contact' }
  ];

  return (
    <Box
      component="footer"
      role="contentinfo"
      aria-label="Site footer"
      sx={{
        width: '100%',
        height: FOOTER_HEIGHT,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}
      className={className}
    >
      <Container
        maxWidth="lg"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          ...spacing
        }}
      >
        {/* Copyright section */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: isSmallScreen ? 'xs' : 'sm',
            textAlign: isMobile ? 'center' : 'left',
            mb: isMobile ? 1 : 0
          }}
        >
          © {CURRENT_YEAR} {COMPANY_NAME}. All rights reserved.
        </Typography>

        {/* Navigation links */}
        <Box
          component="nav"
          aria-label="Footer navigation"
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: isSmallScreen ? 2 : 3,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          {footerLinks.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              color="text.secondary"
              underline="hover"
              sx={{
                fontSize: isSmallScreen ? 'xs' : 'sm',
                transition: theme => theme.transitions.create('color'),
                '&:hover': {
                  color: 'primary.main'
                }
              }}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                // Handle client-side navigation here
              }}
              tabIndex={0}
              aria-label={link.text}
            >
              {link.text}
            </Link>
          ))}
        </Box>
      </Container>
    </Box>
  );
});

// Display name for debugging
Footer.displayName = 'Footer';

export default Footer;