import React from 'react'; // v18.x
import styled from '@emotion/styled'; // v11.x
import { ThemeColors } from '../../types/theme.types';

/**
 * Props interface for the Icon component with comprehensive styling and accessibility options
 */
interface IconProps {
  /** Name of the icon to render from assets/icons directory */
  name: string;
  /** Size variant of the icon */
  size?: 'small' | 'medium' | 'large';
  /** Color of the icon - defaults to theme primary color */
  color?: string;
  /** Additional CSS classes for custom styling */
  className?: string;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Controls whether the icon can receive keyboard focus */
  focusable?: boolean;
}

/**
 * Size mapping for consistent icon scaling
 */
const SIZE_MAP = {
  small: '16px',
  medium: '24px',
  large: '32px',
} as const;

/**
 * Styled SVG container with theme integration and transitions
 */
const StyledSvg = styled.svg<{ $size: string; $color: string }>`
  width: ${props => props.$size};
  height: ${props => props.$size};
  fill: ${props => props.$color};
  transition: fill 0.2s ease-in-out;
  
  /* Ensure proper sizing in flex containers */
  flex-shrink: 0;
  
  /* Improve rendering quality */
  shape-rendering: geometricPrecision;
  
  /* Ensure proper alignment */
  vertical-align: middle;
  
  /* Improve accessibility focus styles */
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

/**
 * A theme-aware, accessible icon component that renders optimized SVG icons
 * with dynamic styling and proper accessibility attributes.
 *
 * @param props - Icon component props
 * @returns Rendered icon component with proper accessibility and styling attributes
 */
const Icon = React.memo<IconProps>(({
  name,
  size = 'medium',
  color,
  className,
  ariaLabel,
  focusable = false
}) => {
  // Dynamically import SVG path data based on icon name
  const iconPath = React.useMemo(() => {
    try {
      // Note: This requires proper webpack/vite configuration for importing SVGs
      return require(`../../assets/icons/${name}.svg`).default;
    } catch (error) {
      console.error(`Failed to load icon: ${name}`, error);
      return null;
    }
  }, [name]);

  // Handle missing icon gracefully
  if (!iconPath) {
    return null;
  }

  // Get size value from size map
  const sizeValue = SIZE_MAP[size];

  return (
    <StyledSvg
      $size={sizeValue}
      $color={color || 'currentColor'}
      viewBox="0 0 24 24" // Standard viewBox for consistent scaling
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel || name}
      focusable={focusable}
      aria-hidden={!focusable}
      tabIndex={focusable ? 0 : undefined}
    >
      <path d={iconPath} />
    </StyledSvg>
  );
});

// Set display name for better debugging
Icon.displayName = 'Icon';

// Default export for the Icon component
export default Icon;

/**
 * Type export for component props to support external usage
 */
export type { IconProps };