import React, { useCallback, useRef } from 'react';
import styled from '@mui/material/styles/styled';
import type { ThemeColors } from '../../types/theme.types';

/**
 * Props interface for the Checkbox component
 * Follows WCAG 2.1 Level AA compliance requirements
 */
export interface CheckboxProps {
  /** Current checked state */
  checked?: boolean;
  /** Initial checked state for uncontrolled component */
  defaultChecked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Unique identifier for the checkbox */
  id?: string;
  /** Label text content */
  label?: string;
  /** Input name attribute */
  name?: string;
  /** Additional CSS classes */
  className?: string;
  /** Change handler callback */
  onChange?: (checked: boolean) => void;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Error state */
  error?: boolean;
  /** Error message text */
  errorMessage?: string;
  /** Help text for additional context */
  helpText?: string;
  /** Required field indicator */
  required?: boolean;
}

/**
 * Styled checkbox input following Material Design principles
 * Supports custom theming and error states
 */
const StyledCheckbox = styled('input')<{ error?: boolean }>(({ theme, error }) => ({
  appearance: 'none',
  width: '18px',
  height: '18px',
  border: `2px solid ${
    error 
      ? (theme.palette as ThemeColors).error.main 
      : theme.palette.text.secondary
  }`,
  borderRadius: '3px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  
  '&:checked': {
    backgroundColor: (theme.palette as ThemeColors).primary.main,
    borderColor: (theme.palette as ThemeColors).primary.main,
    
    '&::after': {
      content: '""',
      position: 'absolute',
      left: '5px',
      top: '2px',
      width: '4px',
      height: '8px',
      border: 'solid white',
      borderWidth: '0 2px 2px 0',
      transform: 'rotate(45deg)',
    }
  },
  
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  
  '&:focus-visible': {
    outline: `2px solid ${(theme.palette as ThemeColors).primary.main}`,
    outlineOffset: '2px',
  },
  
  '&:hover:not(:disabled)': {
    borderColor: (theme.palette as ThemeColors).primary.main,
  },
  
  '@media (hover: none)': {
    minHeight: '24px',
    minWidth: '24px',
  }
}));

/**
 * Styled label container with support for error and help text
 */
const StyledLabel = styled('label')<{ error?: boolean }>(({ theme, error }) => ({
  display: 'inline-flex',
  alignItems: 'flex-start',
  gap: '8px',
  cursor: 'pointer',
  userSelect: 'none',
  color: error 
    ? (theme.palette as ThemeColors).error.main 
    : theme.palette.text.primary,
    
  '&:has(input:disabled)': {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  
  '.checkbox-content': {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  
  '.help-text': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    marginTop: '2px',
  },
  
  '.error-text': {
    fontSize: '0.875rem',
    color: (theme.palette as ThemeColors).error.main,
    marginTop: '2px',
  }
}));

/**
 * Accessible Checkbox component following Material Design principles
 * Supports both controlled and uncontrolled usage
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  defaultChecked,
  disabled = false,
  id,
  label,
  name,
  className,
  onChange,
  ariaLabel,
  error = false,
  errorMessage,
  helpText,
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useRef(`checkbox-${Math.random().toString(36).substr(2, 9)}`);
  const checkboxId = id || generatedId.current;
  
  /**
   * Handles checkbox state changes with enhanced error handling
   * and accessibility announcements
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    
    if (disabled) return;
    
    const newChecked = event.target.checked;
    
    // Announce state change for screen readers
    if (inputRef.current) {
      const announcement = `Checkbox ${label || ''} ${newChecked ? 'checked' : 'unchecked'}`;
      inputRef.current.setAttribute('aria-label', announcement);
    }
    
    onChange?.(newChecked);
  }, [disabled, label, onChange]);

  return (
    <StyledLabel
      htmlFor={checkboxId}
      error={error}
      className={className}
    >
      <StyledCheckbox
        ref={inputRef}
        type="checkbox"
        id={checkboxId}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={handleChange}
        aria-label={ariaLabel || label}
        aria-invalid={error}
        aria-required={required}
        aria-describedby={
          helpText || errorMessage 
            ? `${checkboxId}-description` 
            : undefined
        }
        error={error}
      />
      
      {(label || helpText || errorMessage) && (
        <div className="checkbox-content">
          {label && (
            <span className="checkbox-label">
              {label}
              {required && <span aria-hidden="true"> *</span>}
            </span>
          )}
          
          {helpText && (
            <span 
              id={`${checkboxId}-description`}
              className="help-text"
            >
              {helpText}
            </span>
          )}
          
          {error && errorMessage && (
            <span 
              id={`${checkboxId}-error`}
              className="error-text"
              role="alert"
            >
              {errorMessage}
            </span>
          )}
        </div>
      )}
    </StyledLabel>
  );
};

export default Checkbox;