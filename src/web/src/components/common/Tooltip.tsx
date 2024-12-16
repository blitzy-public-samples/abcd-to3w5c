// React 18.x
import React, { useState, useEffect, useCallback, useRef, ReactNode, memo } from 'react';
// @mui/material version 5.x
import { styled } from '@mui/material/styles';
// lodash version 4.x
import debounce from 'lodash/debounce';

import { ThemeColors } from '../../types/theme.types';
import useMediaQuery from '../../hooks/useMediaQuery';

// Constants for tooltip configuration
const TOOLTIP_OFFSET = 8;
const TOOLTIP_ARROW_SIZE = 6;
const TOOLTIP_ANIMATION_DURATION = 200;
const TOOLTIP_TOUCH_THRESHOLD = 48;
const TOOLTIP_Z_INDEX = 1500;
const TOOLTIP_MAX_WIDTH = 300;
const TOOLTIP_HIDE_DELAY = 100;
const TOOLTIP_SHOW_DELAY = 200;

// Type definition for tooltip positioning
export type TooltipPosition = 
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end';

// Props interface for the Tooltip component
export interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
  interactive?: boolean;
  zIndex?: number;
}

// Styled components for tooltip elements
const TooltipContainer = styled('div')<{ $isInteractive?: boolean }>(({ theme, $isInteractive }) => ({
  position: 'relative',
  display: 'inline-block',
  cursor: $isInteractive ? 'pointer' : 'inherit',
}));

const TooltipContent = styled('div')<{
  $position: TooltipPosition;
  $isVisible: boolean;
  $zIndex: number;
}>(({ theme, $position, $isVisible, $zIndex }) => ({
  position: 'absolute',
  maxWidth: TOOLTIP_MAX_WIDTH,
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: theme.typography.fontSize.sm,
  backgroundColor: (theme.colors as ThemeColors).background.surface,
  color: (theme.colors as ThemeColors).text.primary,
  boxShadow: theme.shadows[1],
  zIndex: $zIndex,
  opacity: $isVisible ? 1 : 0,
  visibility: $isVisible ? 'visible' : 'hidden',
  transition: `opacity ${TOOLTIP_ANIMATION_DURATION}ms ${theme.transitions.easing.easeInOut}, 
               visibility ${TOOLTIP_ANIMATION_DURATION}ms ${theme.transitions.easing.easeInOut}`,
  pointerEvents: 'none',
  whiteSpace: 'pre-line',
  wordBreak: 'break-word',
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

const TooltipArrow = styled('div')<{ $position: TooltipPosition }>(({ theme, $position }) => ({
  position: 'absolute',
  width: TOOLTIP_ARROW_SIZE,
  height: TOOLTIP_ARROW_SIZE,
  backgroundColor: (theme.colors as ThemeColors).background.surface,
  transform: 'rotate(45deg)',
  ...getArrowPosition($position),
}));

// Helper function to calculate arrow position
const getArrowPosition = (position: TooltipPosition) => {
  const offset = -(TOOLTIP_ARROW_SIZE / 2);
  switch (position) {
    case 'top':
    case 'top-start':
    case 'top-end':
      return { bottom: offset, left: '50%' };
    case 'bottom':
    case 'bottom-start':
    case 'bottom-end':
      return { top: offset, left: '50%' };
    case 'left':
      return { right: offset, top: '50%' };
    case 'right':
      return { left: offset, top: '50%' };
    default:
      return { bottom: offset, left: '50%' };
  }
};

// Calculate tooltip position based on trigger element and viewport
const calculatePosition = (
  triggerElement: HTMLElement,
  preferredPosition: TooltipPosition,
  isRTL: boolean,
  isMobile: boolean
) => {
  const rect = triggerElement.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.pageXOffset,
    scrollY: window.pageYOffset,
  };

  // Default position calculations
  const positions = {
    top: {
      top: rect.top - TOOLTIP_OFFSET,
      left: rect.left + rect.width / 2,
    },
    bottom: {
      top: rect.bottom + TOOLTIP_OFFSET,
      left: rect.left + rect.width / 2,
    },
    left: {
      top: rect.top + rect.height / 2,
      left: rect.left - TOOLTIP_OFFSET,
    },
    right: {
      top: rect.top + rect.height / 2,
      left: rect.right + TOOLTIP_OFFSET,
    },
  };

  // Adjust for RTL layout
  if (isRTL) {
    Object.keys(positions).forEach((key) => {
      positions[key as keyof typeof positions].left = viewport.width - positions[key as keyof typeof positions].left;
    });
  }

  // Adjust for mobile devices
  if (isMobile) {
    const touchOffset = TOOLTIP_TOUCH_THRESHOLD / 2;
    Object.keys(positions).forEach((key) => {
      positions[key as keyof typeof positions].top += touchOffset;
    });
  }

  return positions[preferredPosition.split('-')[0] as keyof typeof positions];
};

// Main Tooltip component
export const Tooltip = memo(({
  children,
  content,
  position = 'top',
  delay = TOOLTIP_SHOW_DELAY,
  disabled = false,
  className,
  id,
  isOpen: controlledIsOpen,
  onOpen,
  onClose,
  style,
  interactive = false,
  zIndex = TOOLTIP_Z_INDEX,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { matches: isMobile } = useMediaQuery({ query: '(max-width: 768px)' });
  const isRTL = document.dir === 'rtl';

  const showTooltip = useCallback(debounce(() => {
    if (!disabled && content) {
      setIsVisible(true);
      onOpen?.();
    }
  }, delay), [disabled, content, delay, onOpen]);

  const hideTooltip = useCallback(debounce(() => {
    setIsVisible(false);
    onClose?.();
  }, TOOLTIP_HIDE_DELAY), [onClose]);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsVisible(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  useEffect(() => {
    return () => {
      showTooltip.cancel();
      hideTooltip.cancel();
    };
  }, [showTooltip, hideTooltip]);

  const handleMouseEnter = () => {
    if (!isMobile) {
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      hideTooltip();
    }
  };

  const handleTouchStart = () => {
    if (isMobile) {
      showTooltip();
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      hideTooltip();
    }
  };

  return (
    <TooltipContainer
      ref={triggerRef}
      className={className}
      id={id}
      style={style}
      $isInteractive={interactive}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="tooltip"
      aria-describedby={`tooltip-content-${id}`}
    >
      {children}
      {content && (
        <TooltipContent
          id={`tooltip-content-${id}`}
          $position={position}
          $isVisible={isVisible}
          $zIndex={zIndex}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          {content}
          <TooltipArrow $position={position} />
        </TooltipContent>
      )}
    </TooltipContainer>
  );
});

Tooltip.displayName = 'Tooltip';

export default Tooltip;