import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import Navigation from './Navigation';
import Icon from '../common/Icon';
import useMediaQuery from '../../hooks/useMediaQuery';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for the Sidebar component with accessibility support
 */
interface SidebarProps {
  /** Controls sidebar's open/closed state */
  isOpen?: boolean;
  /** Callback for closing the sidebar */
  onClose?: () => void;
  /** Child components to render */
  children?: React.ReactNode;
  /** Accessibility label */
  'aria-label'?: string;
  /** Accessibility expanded state */
  'aria-expanded'?: boolean;
  /** Whether sidebar can be collapsed */
  isCollapsible?: boolean;
  /** Transition duration in milliseconds */
  transitionDuration?: number;
}

/**
 * Styled container for the sidebar with theme integration and transitions
 */
const SidebarContainer = styled.aside<{
  $isOpen: boolean;
  $isMobile: boolean;
  $transitionDuration: number;
}>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.$isOpen ? '240px' : '64px'};
  background-color: ${props => props.theme.colors.background.paper};
  border-right: 1px solid ${props => props.theme.colors.background.surface};
  transition: all ${props => props.$transitionDuration}ms ease-in-out;
  z-index: 1000;
  overflow-x: hidden;
  overflow-y: auto;
  
  /* Mobile styles */
  @media (max-width: 768px) {
    width: 240px;
    transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background.surface};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.background.surface};
    border-radius: 2px;
  }
`;

/**
 * Styled toggle button for collapsing/expanding the sidebar
 */
const ToggleButton = styled.button<{ $isMobile: boolean }>`
  position: absolute;
  top: 12px;
  right: ${props => props.$isMobile ? '12px' : '-12px'};
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.background.paper};
  color: ${props => props.theme.colors.primary.main};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  z-index: 1001;

  &:hover {
    background-color: ${props => props.theme.colors.background.surface};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary.main};
    outline-offset: 2px;
  }
`;

/**
 * Overlay for mobile sidebar backdrop
 */
const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease-in-out;
  z-index: 999;
`;

/**
 * Sidebar component implementing responsive design, theme integration,
 * and accessibility features as per technical specifications.
 */
const Sidebar = React.memo<SidebarProps>(({
  isOpen = true,
  onClose,
  children,
  'aria-label': ariaLabel = 'Main navigation',
  'aria-expanded': ariaExpanded,
  isCollapsible = true,
  transitionDuration = 300
}) => {
  // Get viewport size and theme information
  const { matches: isMobile } = useMediaQuery({ query: 'screen and (max-width: 768px)' });
  const { themeMode } = useTheme();

  // Local state for sidebar collapse
  const [isCollapsed, setIsCollapsed] = useState(!isOpen);
  
  // Ref for sidebar element and touch handling
  const sidebarRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number>(0);

  // Handle sidebar toggle
  const handleToggle = useCallback(() => {
    if (isCollapsible) {
      setIsCollapsed(prev => !prev);
      if (onClose && isMobile) {
        onClose();
      }
    }
  }, [isCollapsible, onClose, isMobile]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle touch events for mobile swipe
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isMobile) return;

    const touchEndX = event.touches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;

    if (deltaX > 50 && isOpen && onClose) {
      onClose();
    }
  };

  return (
    <>
      {isMobile && (
        <Overlay
          $isOpen={isOpen}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <SidebarContainer
        ref={sidebarRef}
        $isOpen={isOpen}
        $isMobile={isMobile}
        $transitionDuration={transitionDuration}
        role="navigation"
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {isCollapsible && (
          <ToggleButton
            onClick={handleToggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            $isMobile={isMobile}
          >
            <Icon
              name={isCollapsed ? 'chevron-right' : 'chevron-left'}
              size="small"
              aria-hidden="true"
            />
          </ToggleButton>
        )}

        <Navigation
          isCollapsed={isCollapsed}
          onToggle={handleToggle}
          isAccessible={true}
        />

        {children}
      </SidebarContainer>
    </>
  );
});

// Set display name for debugging
Sidebar.displayName = 'Sidebar';

export default Sidebar;

/**
 * Type export for component props
 */
export type { SidebarProps };