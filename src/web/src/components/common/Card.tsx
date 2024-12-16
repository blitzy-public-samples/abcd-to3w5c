import React, { useCallback, useMemo, useState } from 'react'; // v18.x
import classNames from 'classnames'; // v2.x
import { ThemeMode } from '../../types/theme.types';
import Icon from './Icon';

/**
 * Props interface for Card component with comprehensive accessibility and theme support
 */
interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Optional custom CSS classes */
  className?: string;
  /** Enables interactive states (hover, focus, active) */
  interactive?: boolean;
  /** Controls card elevation level */
  elevation?: 'low' | 'medium' | 'high';
  /** Click handler for interactive cards */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Accessibility label */
  ariaLabel?: string;
  /** Data test id for testing */
  testId?: string;
  /** Theme mode override */
  themeMode?: ThemeMode;
  /** ARIA role */
  role?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** Keyboard event handler */
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  /** Disabled state */
  disabled?: boolean;
  /** ARIA describedby */
  ariaDescribedBy?: string;
  /** ARIA expanded state */
  ariaExpanded?: boolean;
  /** Controls whether the card can receive focus */
  focusable?: boolean;
}

/**
 * Elevation mapping to CSS shadow variables
 */
const ELEVATION_MAP = {
  low: 'var(--shadow-sm)',
  medium: 'var(--shadow-md)',
  high: 'var(--shadow-lg)',
} as const;

/**
 * Theme-specific styles mapping
 */
const THEME_STYLES = {
  [ThemeMode.LIGHT]: {
    background: 'var(--color-background-paper)',
    text: 'var(--color-text-primary)',
  },
  [ThemeMode.DARK]: {
    background: 'var(--color-background-paper-dark)',
    text: 'var(--color-text-primary-dark)',
  },
} as const;

/**
 * Interaction state styles
 */
const INTERACTION_STATES = {
  focus: 'var(--focus-ring)',
  hover: 'var(--hover-overlay)',
  active: 'var(--active-overlay)',
} as const;

/**
 * Custom hook for managing card interaction states and accessibility
 */
const useCardInteraction = (props: CardProps) => {
  const {
    interactive,
    disabled,
    onClick,
    onKeyDown,
    focusable = true,
    tabIndex,
  } = props;

  const [isFocusVisible, setIsFocusVisible] = useState(false);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (interactive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
      }

      onKeyDown?.(event);
    },
    [disabled, interactive, onClick, onKeyDown]
  );

  const handleFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.target.matches(':focus-visible')) {
      setIsFocusVisible(true);
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocusVisible(false);
  }, []);

  return {
    isFocusVisible,
    interactionProps: {
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      tabIndex: disabled ? undefined : tabIndex ?? (focusable ? 0 : undefined),
      role: props.role ?? (interactive ? 'button' : undefined),
      'aria-disabled': disabled,
      'aria-label': props.ariaLabel,
      'aria-describedby': props.ariaDescribedBy,
      'aria-expanded': props.ariaExpanded,
    },
  };
};

/**
 * Generates theme-aware CSS class names for the card
 */
const getCardClasses = (props: CardProps, currentTheme: ThemeMode) => {
  const {
    className,
    elevation = 'low',
    interactive,
    disabled,
    themeMode,
  } = props;

  const activeTheme = themeMode || currentTheme;

  return classNames(
    'card',
    `card--${elevation}`,
    `card--${activeTheme}`,
    {
      'card--interactive': interactive && !disabled,
      'card--disabled': disabled,
      'card--focusable': !disabled && (interactive || props.focusable),
    },
    className
  );
};

/**
 * A theme-aware, accessible card component with Material Design elevation
 */
const Card: React.FC<CardProps> = (props) => {
  const {
    children,
    testId,
    onClick,
    disabled,
    themeMode = ThemeMode.LIGHT,
  } = props;

  const { isFocusVisible, interactionProps } = useCardInteraction(props);

  const cardClasses = useMemo(
    () => getCardClasses(props, themeMode),
    [props, themeMode]
  );

  const cardStyles = useMemo(
    () => ({
      backgroundColor: THEME_STYLES[themeMode].background,
      color: THEME_STYLES[themeMode].text,
      boxShadow: ELEVATION_MAP[props.elevation || 'low'],
      cursor: props.interactive && !disabled ? 'pointer' : undefined,
      transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    }),
    [themeMode, props.elevation, props.interactive, disabled]
  );

  return (
    <div
      className={cardClasses}
      style={cardStyles}
      onClick={disabled ? undefined : onClick}
      data-testid={testId}
      {...interactionProps}
    >
      {children}
      {isFocusVisible && (
        <div
          className="card__focus-ring"
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 'inherit',
            boxShadow: INTERACTION_STATES.focus,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

// Set display name for better debugging
Card.displayName = 'Card';

export default Card;
export type { CardProps };