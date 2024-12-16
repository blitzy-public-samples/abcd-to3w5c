// react version 18.x
// @mui/material version 5.x
import React, { useState, useEffect, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { ThemeMode } from '../../types/theme.types';
import useTheme from '../../hooks/useTheme';

// Constants for styling and animations
const TRANSITION_DURATION = 200;
const TAB_HEIGHT = 48;
const INDICATOR_HEIGHT = 2;
const FOCUS_VISIBLE_OUTLINE = '2px solid var(--focus-color)';
const TAB_PADDING = '16px';
const MIN_TAB_WIDTH = '90px';

// Interfaces
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeTab?: string;
  onChange: (tabId: string) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
  className?: string;
}

// Styled Components
const TabsContainer = styled('div')<{ fullWidth?: boolean; themeMode: ThemeMode }>(
  ({ theme, fullWidth, themeMode }) => ({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: themeMode === ThemeMode.DARK 
      ? theme.colors.background.paper 
      : theme.colors.background.surface,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    transition: `background-color ${TRANSITION_DURATION}ms ${theme.transitions.easing.easeInOut}`,

    '.tabs-header': {
      display: 'flex',
      borderBottom: `1px solid ${
        themeMode === ThemeMode.DARK 
          ? 'rgba(255, 255, 255, 0.12)' 
          : 'rgba(0, 0, 0, 0.12)'
      }`,
      position: 'relative',
      width: '100%',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none'
      },
      ...(fullWidth && {
        '.tab-button': {
          flex: 1
        }
      })
    },

    '.tab-indicator': {
      position: 'absolute',
      bottom: 0,
      height: INDICATOR_HEIGHT,
      backgroundColor: theme.colors.primary.main,
      transition: `all ${TRANSITION_DURATION}ms ${theme.transitions.easing.easeInOut}`,
    },

    '.tab-content': {
      padding: theme.spacing(2),
      minHeight: '100px',
    }
  })
);

const TabButton = styled('button')<{ 
  isActive: boolean; 
  disabled?: boolean;
  themeMode: ThemeMode;
}>(({ theme, isActive, disabled, themeMode }) => ({
  height: TAB_HEIGHT,
  padding: `0 ${TAB_PADDING}`,
  minWidth: MIN_TAB_WIDTH,
  border: 'none',
  background: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled
    ? themeMode === ThemeMode.DARK 
      ? 'rgba(255, 255, 255, 0.38)' 
      : 'rgba(0, 0, 0, 0.38)'
    : isActive
    ? theme.colors.primary.main
    : themeMode === ThemeMode.DARK 
      ? theme.colors.primary.light 
      : theme.colors.primary.dark,
  fontSize: theme.typography.fontSize.base,
  fontWeight: isActive ? theme.typography.fontWeight.medium : theme.typography.fontWeight.regular,
  transition: `all ${TRANSITION_DURATION}ms ${theme.transitions.easing.easeInOut}`,
  opacity: disabled ? 0.5 : 1,
  position: 'relative',
  
  '&:hover:not(:disabled)': {
    backgroundColor: themeMode === ThemeMode.DARK 
      ? 'rgba(255, 255, 255, 0.08)' 
      : 'rgba(0, 0, 0, 0.04)',
  },

  '&:focus-visible': {
    outline: 'none',
    boxShadow: `0 0 0 2px ${theme.colors.primary.main}`,
  },

  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    backgroundColor: 'currentColor',
    opacity: 0,
    transition: `opacity ${TRANSITION_DURATION}ms ${theme.transitions.easing.easeInOut}`,
  },

  '@media (max-width: 600px)': {
    padding: `0 ${parseInt(TAB_PADDING) / 2}px`,
    minWidth: parseInt(MIN_TAB_WIDTH) * 0.8,
    fontSize: theme.typography.fontSize.sm,
  }
}));

const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onChange,
  ariaLabel = 'Tab Navigation',
  fullWidth = false,
  className
}) => {
  const { themeMode } = useTheme();
  const [activeTabId, setActiveTabId] = useState<string>(activeTab || items[0]?.id || '');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Handle keyboard navigation
  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    const validKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!validKeys.includes(event.key)) return;

    event.preventDefault();
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowRight':
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
    }

    // Skip disabled tabs
    while (items[newIndex]?.disabled) {
      newIndex = event.key === 'ArrowLeft' 
        ? (newIndex > 0 ? newIndex - 1 : items.length - 1)
        : (newIndex < items.length - 1 ? newIndex + 1 : 0);
    }

    const newTabId = items[newIndex]?.id;
    if (newTabId) {
      setActiveTabId(newTabId);
      onChange(newTabId);
      // Focus the new tab button
      const tabButtons = document.querySelectorAll('.tab-button');
      (tabButtons[newIndex] as HTMLButtonElement)?.focus();
    }
  }, [items, onChange]);

  // Update indicator position
  useEffect(() => {
    const updateIndicator = () => {
      const activeElement = document.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement as HTMLElement;
        setIndicatorStyle({
          left: offsetLeft,
          width: offsetWidth
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTabId]);

  // Handle tab selection
  const handleTabClick = useCallback((tabId: string, disabled?: boolean) => {
    if (disabled) return;
    setActiveTabId(tabId);
    onChange(tabId);
  }, [onChange]);

  return (
    <TabsContainer 
      className={className}
      fullWidth={fullWidth}
      themeMode={themeMode}
      role="tablist"
      aria-label={ariaLabel}
    >
      <div className="tabs-header">
        {items.map((tab, index) => (
          <TabButton
            key={tab.id}
            className="tab-button"
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={activeTabId === tab.id ? 0 : -1}
            data-tab-id={tab.id}
            isActive={activeTabId === tab.id}
            disabled={tab.disabled}
            themeMode={themeMode}
            onClick={() => handleTabClick(tab.id, tab.disabled)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </TabButton>
        ))}
        <div 
          className="tab-indicator"
          style={indicatorStyle}
          aria-hidden="true"
        />
      </div>
      <div className="tab-content">
        {items.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={tab.id}
            hidden={activeTabId !== tab.id}
          >
            {activeTabId === tab.id && tab.content}
          </div>
        ))}
      </div>
    </TabsContainer>
  );
};

export default Tabs;