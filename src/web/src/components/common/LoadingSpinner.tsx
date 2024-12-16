import React from 'react'; // v18.x
import loading from '../../assets/images/loading.svg';

interface LoadingSpinnerProps {
  /** Size of the spinner in pixels */
  size?: string | number;
  /** Color of the spinner, defaults to current text color */
  color?: string;
  /** Additional CSS classes for styling */
  className?: string;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Animation duration for one complete rotation */
  speed?: string;
  /** Stroke width of the spinner circle */
  thickness?: number;
  /** ARIA role override for custom accessibility needs */
  role?: string;
}

/**
 * A customizable loading spinner component that follows Material Design principles
 * and provides enhanced accessibility features.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingSpinner />
 * 
 * // Customized spinner
 * <LoadingSpinner 
 *   size={32} 
 *   color="#1976d2" 
 *   speed="0.8s" 
 *   thickness={3} 
 * />
 * ```
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  size = 24,
  color = 'currentColor',
  className = '',
  ariaLabel = 'Loading...',
  speed = '1s',
  thickness = 2,
  role = 'status'
}) => {
  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => 
    typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  , []);

  // Calculate adjusted animation speed for reduced motion
  const animationDuration = React.useMemo(() => 
    prefersReducedMotion ? '2s' : speed
  , [prefersReducedMotion, speed]);

  // Prepare CSS variables for theme and animation control
  const cssVariables = React.useMemo(() => ({
    '--spinner-size': typeof size === 'number' ? `${size}px` : size,
    '--spinner-color': color,
    '--spinner-duration': animationDuration,
    '--spinner-thickness': `${thickness}px`,
  }), [size, color, animationDuration, thickness]);

  // Prepare wrapper styles with proper containment hints
  const wrapperStyle = React.useMemo(() => ({
    ...cssVariables,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: cssVariables['--spinner-size'],
    height: cssVariables['--spinner-size'],
    contain: 'layout style paint' as const,
    willChange: 'transform',
  }), [cssVariables]);

  return (
    <div
      className={`loading-spinner-wrapper ${className}`.trim()}
      style={wrapperStyle}
      role={role}
      aria-label={ariaLabel}
      aria-live="polite"
      data-testid="loading-spinner"
    >
      <svg
        className="loading-spinner"
        viewBox={loading.viewBox}
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{
          animation: `spin ${animationDuration} linear infinite`,
          color: 'inherit',
        }}
      >
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @media (forced-colors: active) {
              .loading-spinner { color: CanvasText; }
            }
          `}
        </style>
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          style={{
            stroke: 'currentColor',
          }}
        />
      </svg>
    </div>
  );
});

// Display name for debugging purposes
LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;