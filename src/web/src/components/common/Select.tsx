import React, { useCallback, useMemo, useRef, useEffect } from 'react'; // v18.x
import styled from '@emotion/styled'; // v11.x
import { ThemeColors } from '../../types/theme.types';
import Icon from './Icon';

// Types and Interfaces
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string | string[] | number | number[];
  onChange: (value: string | string[] | number | number[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
}

// Styled Components
const SelectContainer = styled.div<{ $hasError: boolean; $isOpen: boolean }>`
  position: relative;
  width: 100%;
  font-family: inherit;

  &:focus-within {
    outline: none;
  }
`;

const SelectButton = styled.button<{
  $hasError: boolean;
  $isOpen: boolean;
  $disabled: boolean;
}>`
  width: 100%;
  min-height: 48px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.background.paper};
  border: 2px solid ${({ theme, $hasError, $isOpen }) =>
    $hasError
      ? theme.colors.error.main
      : $isOpen
      ? theme.colors.primary.main
      : theme.colors.background.surface};
  border-radius: 4px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition: all 0.2s ease-in-out;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.error.main : theme.colors.primary.light};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary.main}40;
  }
`;

const DropdownContainer = styled.div<{ $maxHeight: string }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: ${({ $maxHeight }) => $maxHeight};
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background.paper};
  border: 1px solid ${({ theme }) => theme.colors.background.surface};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;

  /* Scrollbar styling */
  scrollbar-width: thin;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.primary.light};
    border-radius: 3px;
  }
`;

const Option = styled.div<{
  $isSelected: boolean;
  $isDisabled: boolean;
  $isFocused: boolean;
}>`
  padding: 8px 16px;
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  background: ${({ theme, $isSelected, $isFocused }) =>
    $isSelected
      ? theme.colors.primary.main + '20'
      : $isFocused
      ? theme.colors.primary.main + '10'
      : 'transparent'};
  color: ${({ theme, $isDisabled }) =>
    $isDisabled ? theme.colors.background.surface : 'inherit'};
  opacity: ${({ $isDisabled }) => ($isDisabled ? 0.5 : 1)};
  transition: background-color 0.2s ease;

  &:hover:not([disabled]) {
    background: ${({ theme, $isSelected }) =>
      $isSelected
        ? theme.colors.primary.main + '30'
        : theme.colors.primary.main + '10'};
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error.main};
  font-size: 0.875rem;
  margin-top: 4px;
  min-height: 20px;
`;

const SelectedValue = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const MultipleValue = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.colors.primary.main + '20'};
  padding: 2px 8px;
  border-radius: 16px;
  font-size: 0.875rem;
`;

// Main Component
const Select = React.memo<SelectProps>(({
  options,
  value,
  onChange,
  multiple = false,
  disabled = false,
  placeholder,
  error,
  required = false,
  className,
  id,
  name,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchString = useRef<string>('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            handleSelect(option);
          }
        }
        event.preventDefault();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;

      case 'Escape':
        setIsOpen(false);
        break;

      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;

      default:
        // Type to select functionality
        if (event.key.length === 1) {
          clearTimeout(searchTimeout.current);
          searchString.current += event.key.toLowerCase();
          
          const matchingIndex = options.findIndex(option =>
            option.label.toLowerCase().startsWith(searchString.current)
          );

          if (matchingIndex >= 0) {
            setFocusedIndex(matchingIndex);
          }

          searchTimeout.current = setTimeout(() => {
            searchString.current = '';
          }, 500);
        }
        break;
    }
  }, [isOpen, focusedIndex, options, disabled]);

  // Handle option selection
  const handleSelect = useCallback((option: SelectOption) => {
    if (disabled || option.disabled) return;

    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      const optionValue = option.value.toString();
      
      if (newValue.includes(optionValue)) {
        onChange(newValue.filter(v => v !== optionValue));
      } else {
        onChange([...newValue, optionValue]);
      }
    } else {
      onChange(option.value);
      setIsOpen(false);
    }
  }, [value, onChange, multiple, disabled]);

  // Render selected value(s)
  const renderValue = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      
      return (
        <SelectedValue>
          {value.map(v => {
            const option = options.find(opt => opt.value.toString() === v);
            return option ? (
              <MultipleValue key={v}>
                {option.label}
                <Icon
                  name="close"
                  size="small"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  focusable
                  ariaLabel={`Remove ${option.label}`}
                />
              </MultipleValue>
            ) : null;
          })}
        </SelectedValue>
      );
    }

    const selectedOption = options.find(opt => opt.value.toString() === value.toString());
    return selectedOption ? selectedOption.label : placeholder;
  }, [value, options, multiple, placeholder]);

  return (
    <SelectContainer
      ref={containerRef}
      $hasError={!!error}
      $isOpen={isOpen}
      className={className}
    >
      <SelectButton
        type="button"
        $hasError={!!error}
        $isOpen={isOpen}
        $disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={!!error}
        aria-required={required}
        aria-label={ariaLabel}
        id={id}
      >
        {renderValue}
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size="small"
          aria-hidden="true"
        />
      </SelectButton>

      {isOpen && (
        <DropdownContainer
          ref={dropdownRef}
          $maxHeight="250px"
          role="listbox"
          aria-multiselectable={multiple}
        >
          {options.map((option, index) => (
            <Option
              key={option.value}
              $isSelected={Array.isArray(value)
                ? value.includes(option.value.toString())
                : value.toString() === option.value.toString()
              }
              $isDisabled={!!option.disabled}
              $isFocused={focusedIndex === index}
              onClick={() => handleSelect(option)}
              role="option"
              aria-selected={Array.isArray(value)
                ? value.includes(option.value.toString())
                : value.toString() === option.value.toString()
              }
              aria-disabled={option.disabled}
            >
              {option.label}
            </Option>
          ))}
        </DropdownContainer>
      )}

      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
    </SelectContainer>
  );
});

Select.displayName = 'Select';

export default Select;
export type { SelectProps, SelectOption };