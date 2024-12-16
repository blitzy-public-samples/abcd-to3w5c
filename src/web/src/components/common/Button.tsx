import React, { memo } from 'react';
import { ButtonBase } from '@mui/material'; // @mui/material version 5.x
import styled from '@emotion/styled'; // @emotion/styled version 11.x
import { useRipple } from '@mui/material'; // @mui/material version 5.x
import { ThemeColors } from '../../types/theme.types';

/**
 * Props interface for the Button component with comprehensive accessibility support
 * Extends native button attributes to maintain full HTML button functionality
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'text';
  /** Size variant affecting padding and font size */
  size?: 'small' | 'medium' | 'large';
  /** Whether button should occupy full width of container */
  fullWidth?: boolean;
  /** Disabled state with visual indicators */
  disabled?: boolean;
  /** Loading state with spinner and disabled interaction */
  loading?: boolean;
  /** Icon element to display before button text */
  startIcon?: React.ReactNode;
  /** Icon element to display after button text */
  endIcon?: React.ReactNode;
  /** Button content with proper spacing and alignment */
  children: React.ReactNode;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** ID of element describing the button */
  ariaDescribedBy?: string;
  /** Whether the button controls an expanded element */
  ariaExpanded?: boolean;
  /** ID of element controlled by the button */
  ariaControls?: string;
  /** Click handler with proper event typing */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Custom hook for generating theme-aware button styles
 * Ensures WCAG 2.1 Level AA contrast compliance
 */
const useButtonStyles = (props: ButtonProps, theme: ThemeColors) => {
  const {
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    disabled = false,
    loading = false
  } = props;

  // Base styles including focus and hover states
  const baseStyles = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '4px',
    fontWeight: 500,
    transition: 'all 0.2s ease-in-out',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    
    '&:focus-visible': {
      outline: '2px solid',
      outlineOffset: '2px',
      outlineColor: variant === 'primary' 
        ? theme.primary.main 
        : theme.secondary.main,
    },
  };

  // Size-specific styles
  const sizeStyles = {
    small: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      minHeight: '32px',
    },
    medium: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
      minHeight: '40px',
    },
    large: {
      padding: '1rem 2rem',
      fontSize: '1.125rem',
      minHeight: '48px',
    },
  }[size];

  // Variant-specific styles
  const variantStyles = {
    primary: {
      backgroundColor: theme.primary.main,
      color: theme.primary.contrastText,
      border: 'none',
      '&:hover:not(:disabled)': {
        backgroundColor: theme.primary.dark,
      },
    },
    secondary: {
      backgroundColor: theme.secondary.main,
      color: theme.secondary.contrastText,
      border: 'none',
      '&:hover:not(:disabled)': {
        backgroundColor: theme.secondary.dark,
      },
    },
    text: {
      backgroundColor: 'transparent',
      color: theme.primary.main,
      border: 'none',
      '&:hover:not(:disabled)': {
        backgroundColor: `${theme.primary.main}10`,
      },
    },
  }[variant];

  return {
    ...baseStyles,
    ...sizeStyles,
    ...variantStyles,
  };
};

/**
 * StyledButton component with theme-aware styling
 */
const StyledButton = styled(ButtonBase)<ButtonProps>(
  ({ theme, ...props }) => useButtonStyles(props, theme.colors)
);

/**
 * Loading spinner component with proper ARIA attributes
 */
const LoadingSpinner = styled.span`
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
`;

/**
 * Button component implementing Material Design principles with full accessibility support
 * Complies with WCAG 2.1 Level AA requirements
 */
const Button = memo<ButtonProps>(({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  children,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  onClick,
  ...props
}) => {
  // Handle click events when not disabled or loading
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && onClick) {
      onClick(event);
    }
  };

  return (
    <StyledButton
      component="button"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-busy={loading}
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {loading && <LoadingSpinner aria-hidden="true" />}
      {!loading && startIcon && (
        <span className="button-start-icon" aria-hidden="true">
          {startIcon}
        </span>
      )}
      <span className="button-content">{children}</span>
      {!loading && endIcon && (
        <span className="button-end-icon" aria-hidden="true">
          {endIcon}
        </span>
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button;