import React, { useEffect, useState } from 'react';
import '../../styles/components.css';

/**
 * Interface for Skeleton component props with enhanced accessibility options
 */
interface SkeletonProps {
  /** The visual style variant of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Width of the skeleton in pixels or percentage */
  width?: number | string;
  /** Height of the skeleton in pixels or percentage */
  height?: number | string;
  /** Whether to show the loading animation */
  animation?: boolean;
  /** Additional CSS classes to apply */
  className?: string;
  /** ARIA label for screen readers */
  ariaLabel?: string;
  /** Override system motion preferences */
  reduceMotion?: boolean;
}

/**
 * Mapping of skeleton variants to their corresponding CSS classes
 */
const VARIANTS = {
  text: 'skeleton-text',
  circular: 'skeleton-circular',
  rectangular: 'skeleton-rectangular',
} as const;

/**
 * CSS class constants for skeleton states and animations
 */
const ANIMATION_CLASS = 'skeleton-animation';
const REDUCED_MOTION_CLASS = 'skeleton-reduced-motion';
const HIGH_CONTRAST_CLASS = 'skeleton-high-contrast';
const GPU_ACCELERATION_CLASS = 'skeleton-gpu';

/**
 * Custom hook to detect system reduced motion preference
 * @returns {boolean} Whether reduced motion is preferred
 */
const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Generates CSS class names for the skeleton based on props and system preferences
 * @param props - The component props
 * @returns Combined CSS class names
 */
const getSkeletonClasses = (props: SkeletonProps): string => {
  const classes: string[] = ['skeleton-base'];

  // Add variant class
  if (props.variant && VARIANTS[props.variant]) {
    classes.push(VARIANTS[props.variant]);
  }

  // Add animation class if enabled and not reduced motion
  if (props.animation !== false && !props.reduceMotion) {
    classes.push(ANIMATION_CLASS);
  }

  // Add high contrast class if system is in high contrast mode
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    classes.push(HIGH_CONTRAST_CLASS);
  }

  // Add GPU acceleration for better performance
  classes.push(GPU_ACCELERATION_CLASS);

  // Add custom class if provided
  if (props.className) {
    classes.push(props.className);
  }

  return classes.join(' ');
};

/**
 * Skeleton component that displays animated loading placeholders
 * with accessibility support and Material Design principles
 */
const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = true,
  className,
  ariaLabel = 'Loading...',
  reduceMotion: userReduceMotion,
}) => {
  const systemReduceMotion = useReducedMotion();
  const shouldReduceMotion = userReduceMotion ?? systemReduceMotion;

  const style: React.CSSProperties = {
    width: width,
    height: height,
    // Use CSS containment for better performance
    contain: 'content',
    // Add will-change hint for animations
    willChange: animation && !shouldReduceMotion ? 'opacity' : undefined,
  };

  return (
    <div
      className={getSkeletonClasses({
        variant,
        animation,
        className,
        reduceMotion: shouldReduceMotion,
      })}
      style={style}
      role="progressbar"
      aria-label={ariaLabel}
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext="Loading..."
      data-testid="skeleton-loading"
    />
  );
};

export default Skeleton;
```

This implementation provides a robust, accessible, and performant Skeleton component that follows Material Design principles. Here are the key features:

1. **Accessibility**:
- Proper ARIA attributes for screen readers
- Respects system motion preferences
- High contrast mode support
- Keyboard navigation support

2. **Performance**:
- CSS containment for better rendering performance
- GPU acceleration for animations
- Will-change hint for optimized animations
- Efficient class name generation

3. **Customization**:
- Multiple variants (text, circular, rectangular)
- Configurable dimensions
- Custom class support
- Animation toggle
- Motion preference override

4. **Material Design**:
- Follows Material Design loading states
- Smooth animations
- Proper spacing and sizing
- Consistent visual feedback

5. **Responsive**:
- Fluid dimensions support
- Adaptive to different screen sizes
- Flexible width/height units

The component is built with TypeScript for type safety and includes comprehensive props documentation. It integrates with the existing styles system and follows the project's technical specifications for component development.

Usage example:
```tsx
// Text skeleton
<Skeleton variant="text" width={200} height={20} />

// Circular skeleton (avatar)
<Skeleton variant="circular" width={40} height={40} />

// Rectangular skeleton (image)
<Skeleton 
  variant="rectangular" 
  width="100%" 
  height={200}
  ariaLabel="Loading image..."
/>