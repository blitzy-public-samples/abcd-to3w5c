// @mui/material version 5.x
// react version 18.x
import React, { useMemo } from 'react';
import styled, { keyframes } from '@mui/material/styles';
import { ThemeMode } from '../../types/theme.types';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for the ProgressBar component with enhanced customization options
 */
interface ProgressBarProps {
  value: number;
  maxValue?: number;
  label?: string;
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
  isIndeterminate?: boolean;
  customStyles?: React.CSSProperties;
}

/**
 * Calculates and validates the percentage value for progress display
 * @param value Current progress value
 * @param maxValue Maximum possible value
 * @returns Calculated percentage between 0 and 100
 */
const calculatePercentage = (value: number, maxValue: number = 100): number => {
  if (maxValue <= 0) return 0;
  const percentage = (Math.max(0, value) / maxValue) * 100;
  return Math.min(Math.max(0, Math.round(percentage)), 100);
};

// Keyframes for indeterminate animation
const indeterminateAnimation = keyframes`
  0% {
    transform: translateX(-100%) scaleX(0);
  }
  50% {
    transform: translateX(0%) scaleX(0.5);
  }
  100% {
    transform: translateX(100%) scaleX(0);
  }
`;

// Styled components with theme integration
const ProgressBarContainer = styled('div')<{ size: string }>(({ theme, size }) => ({
  width: '100%',
  height: size === 'small' ? '4px' : size === 'large' ? '12px' : '8px',
  backgroundColor: theme.palette.mode === ThemeMode.DARK 
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.12)',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  position: 'relative',
  transition: theme.transitions.create(['background-color']),
}));

const ProgressBarFill = styled('div')<{
  $color: string;
  $animated: boolean;
  $isIndeterminate: boolean;
}>(({ theme, $color, $animated, $isIndeterminate }) => ({
  height: '100%',
  backgroundColor: theme.palette[$color].main,
  transition: $animated ? theme.transitions.create(['width', 'background-color'], {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }) : 'none',
  borderRadius: 'inherit',
  transformOrigin: 'left center',
  ...$isIndeterminate && {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    animation: `${indeterminateAnimation} 2s ease-in-out infinite`,
    width: '50%',
  },
}));

const ProgressBarLabel = styled('span')(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(1),
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: theme.typography.caption.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.secondary,
  userSelect: 'none',
  transition: theme.transitions.create(['color']),
}));

/**
 * ProgressBar component that visualizes completion or progress status
 * with customizable appearance, animations, and accessibility features.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  maxValue = 100,
  label,
  color = 'primary',
  size = 'medium',
  showLabel = true,
  animated = true,
  className,
  ariaLabel,
  isIndeterminate = false,
  customStyles,
}) => {
  const { themeMode } = useTheme();

  // Memoize percentage calculation
  const percentage = useMemo(() => 
    isIndeterminate ? 0 : calculatePercentage(value, maxValue),
    [value, maxValue, isIndeterminate]
  );

  // Memoize label text
  const labelText = useMemo(() => 
    label || `${percentage}%`,
    [label, percentage]
  );

  return (
    <ProgressBarContainer
      size={size}
      className={className}
      style={customStyles}
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel || `Progress: ${labelText}`}
      aria-valuetext={isIndeterminate ? 'In progress' : `${percentage} percent`}
    >
      <ProgressBarFill
        $color={color}
        $animated={animated}
        $isIndeterminate={isIndeterminate}
        style={!isIndeterminate ? { width: `${percentage}%` } : undefined}
      />
      {showLabel && !isIndeterminate && (
        <ProgressBarLabel>
          {labelText}
        </ProgressBarLabel>
      )}
    </ProgressBarContainer>
  );
};

export default ProgressBar;