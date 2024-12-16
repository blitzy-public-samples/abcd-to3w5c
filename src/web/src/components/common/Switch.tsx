import React, { useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { Switch as MuiSwitch } from '@mui/material';
import { ThemeMode } from '../../types/theme.types';

// Define size constants for the switch component
const SWITCH_SIZES = {
  small: '24px',
  medium: '34px',
  large: '44px'
} as const;

// Define color variants mapping to theme colors
const SWITCH_COLORS = {
  primary: 'primary.main',
  secondary: 'secondary.main',
  error: 'error.main'
} as const;

/**
 * Props interface for the Switch component
 */
interface SwitchProps {
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  ariaLabel?: string;
  size?: keyof typeof SWITCH_SIZES;
  color?: keyof typeof SWITCH_COLORS;
}

/**
 * Styled wrapper for Material UI Switch with theme support
 * @version @mui/material 5.x
 */
const StyledSwitch = styled(MuiSwitch, {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'color',
})(({ theme, size = 'medium', color = 'primary' }) => ({
  width: SWITCH_SIZES[size],
  height: Math.floor(parseInt(SWITCH_SIZES[size]) * 0.6),
  padding: 0,
  
  '& .MuiSwitch-switchBase': {
    padding: 2,
    '&.Mui-checked': {
      transform: 'translateX(100%)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette[color].main,
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      border: '6px solid #fff',
      boxShadow: `0 0 0 4px ${theme.palette[color].light}`,
    },
    '&.Mui-disabled': {
      '& .MuiSwitch-thumb': {
        backgroundColor: 
          theme.palette.mode === ThemeMode.LIGHT
            ? theme.palette.grey[100]
            : theme.palette.grey[600],
      },
      '& + .MuiSwitch-track': {
        opacity: theme.palette.mode === ThemeMode.LIGHT ? 0.7 : 0.3,
      },
    },
  },

  '& .MuiSwitch-thumb': {
    width: Math.floor(parseInt(SWITCH_SIZES[size]) * 0.4),
    height: Math.floor(parseInt(SWITCH_SIZES[size]) * 0.4),
    borderRadius: '50%',
    transition: theme.transitions.create(['width'], {
      duration: 200,
    }),
  },

  '& .MuiSwitch-track': {
    borderRadius: Math.floor(parseInt(SWITCH_SIZES[size]) * 0.3),
    backgroundColor: theme.palette.mode === ThemeMode.LIGHT 
      ? theme.palette.grey[400]
      : theme.palette.grey[800],
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },

  // Hover effect
  '&:hover': {
    '& .MuiSwitch-thumb': {
      boxShadow: `0 0 0 8px ${theme.palette[color].light}33`,
    },
  },

  // Focus ring for accessibility
  '& .MuiSwitch-input:focus + .MuiSwitch-thumb': {
    outline: 'none',
    boxShadow: `0 0 0 4px ${theme.palette[color].light}`,
  },
}));

/**
 * A customizable toggle switch component that follows Material Design principles
 * and supports theme modes, providing an accessible way to toggle between states.
 * 
 * @param {SwitchProps} props - The props for the Switch component
 * @returns {JSX.Element} A themed and accessible switch component
 */
const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  ariaLabel,
  size = 'medium',
  color = 'primary',
}) => {
  // Handle keyboard interaction for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const syntheticEvent = {
        target: {
          checked: !checked,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  }, [checked, onChange]);

  return (
    <StyledSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      id={id}
      name={name}
      size={size}
      color={color}
      inputProps={{
        'aria-label': ariaLabel || 'toggle switch',
        'aria-checked': checked,
        'role': 'switch',
        'tabIndex': disabled ? -1 : 0,
      }}
      onKeyDown={handleKeyDown}
      focusVisibleClassName="Mui-focusVisible"
    />
  );
};

export default Switch;