import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.x
import { TextField } from '@mui/material'; // v5.x
import { useTheme } from '@mui/material'; // v5.x
import { 
  validateRequired, 
  validateEmail, 
  validateDate, 
  VALIDATION_MESSAGES 
} from '../../utils/validation.utils';
import type { ValidationResult } from '../../utils/validation.utils';

/**
 * Props interface for the Input component with comprehensive validation and accessibility support
 */
export interface InputProps {
  name: string;
  type: 'text' | 'email' | 'password' | 'date' | 'number';
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  helperText?: string;
  fullWidth?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Enhanced Input component with comprehensive validation, accessibility, and theming support
 * Implements Material Design guidelines and supports both light and dark themes
 */
const Input: React.FC<InputProps> = ({
  name,
  type,
  value,
  onChange,
  label,
  placeholder,
  required = false,
  error,
  disabled = false,
  autoFocus = false,
  maxLength,
  minLength,
  pattern,
  helperText,
  fullWidth = true,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  // State management for internal value and validation
  const [internalValue, setInternalValue] = useState<string>(value);
  const [validationState, setValidationState] = useState<ValidationResult>({
    isValid: true,
    errors: {},
    touched: false,
  });
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Get theme for styling
  const theme = useTheme();

  // Memoized validation function with debounce
  const validateInput = useMemo(() => {
    return (inputValue: string): ValidationResult => {
      const validations: ValidationResult[] = [];

      // Required field validation
      if (required) {
        validations.push(validateRequired(inputValue));
      }

      // Type-specific validation
      switch (type) {
        case 'email':
          validations.push(validateEmail(inputValue));
          break;
        case 'date':
          validations.push(validateDate(new Date(inputValue)));
          break;
        case 'number':
          const numberValue = Number(inputValue);
          if (isNaN(numberValue)) {
            validations.push({
              isValid: false,
              errors: { number: 'Please enter a valid number' },
              touched: true,
            });
          }
          break;
      }

      // Pattern validation
      if (pattern && inputValue) {
        const regex = new RegExp(pattern);
        if (!regex.test(inputValue)) {
          validations.push({
            isValid: false,
            errors: { pattern: VALIDATION_MESSAGES.INVALID_FORMAT },
            touched: true,
          });
        }
      }

      // Length validation
      if (minLength && inputValue.length < minLength) {
        validations.push({
          isValid: false,
          errors: { 
            length: VALIDATION_MESSAGES.INVALID_LENGTH
              .replace('{min}', minLength.toString())
              .replace('{max}', (maxLength || '').toString())
          },
          touched: true,
        });
      }

      if (maxLength && inputValue.length > maxLength) {
        validations.push({
          isValid: false,
          errors: { 
            length: VALIDATION_MESSAGES.INVALID_LENGTH
              .replace('{min}', (minLength || '').toString())
              .replace('{max}', maxLength.toString())
          },
          touched: true,
        });
      }

      // Combine all validation results
      return validations.reduce((acc, curr) => ({
        isValid: acc.isValid && curr.isValid,
        errors: { ...acc.errors, ...curr.errors },
        touched: acc.touched || curr.touched,
      }), { isValid: true, errors: {}, touched: true });
    };
  }, [type, required, pattern, minLength, maxLength]);

  // Handle input change with validation
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    setIsDirty(true);

    // Perform validation
    const validationResult = validateInput(newValue);
    setValidationState(validationResult);

    // Notify parent component
    onChange(newValue, validationResult.isValid);
  }, [onChange, validateInput]);

  // Handle blur event for validation
  const handleBlur = useCallback(() => {
    if (isDirty) {
      const validationResult = validateInput(internalValue);
      setValidationState(validationResult);
    }
  }, [internalValue, isDirty, validateInput]);

  // Sync internal value with prop value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Generate error message
  const errorMessage = error || 
    (validationState.touched && !validationState.isValid && 
      Object.values(validationState.errors)[0]);

  // Generate unique IDs for accessibility
  const inputId = `input-${name}`;
  const helperId = `helper-${name}`;
  const errorId = `error-${name}`;

  return (
    <TextField
      id={inputId}
      name={name}
      type={type}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      label={label}
      placeholder={placeholder}
      required={required}
      error={!!errorMessage}
      disabled={disabled}
      autoFocus={autoFocus}
      fullWidth={fullWidth}
      helperText={errorMessage || helperText}
      inputProps={{
        maxLength,
        minLength,
        pattern,
        'aria-label': ariaLabel || label,
        'aria-required': required,
        'aria-invalid': !!errorMessage,
        'aria-describedby': `${helperId} ${errorId} ${ariaDescribedBy || ''}`.trim(),
      }}
      FormHelperTextProps={{
        id: errorMessage ? errorId : helperId,
      }}
      sx={{
        '& .MuiInputBase-root': {
          borderRadius: theme.shape.borderRadius,
        },
        '& .MuiOutlinedInput-root': {
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
            },
          },
        },
        '& .MuiInputLabel-root': {
          color: theme.palette.text.secondary,
        },
        '& .Mui-error': {
          color: theme.palette.error.main,
        },
      }}
    />
  );
};

export default Input;